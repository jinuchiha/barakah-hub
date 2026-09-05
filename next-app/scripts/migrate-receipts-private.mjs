/**
 * One-time migration: public receipt blobs → private storage.
 *
 * Before this migration, receipts (bank-transfer screenshots) were uploaded
 * with access:'public' and addRandomSuffix:false — publicly fetchable
 * forever by anyone holding the URL. This script:
 *
 *   1. Lists every blob under receipts/.
 *   2. Finds the payment row whose receipt_url points at it (that names the
 *      owning member).
 *   3. Re-uploads it PRIVATE under receipts/<memberId>/... (random suffix).
 *   4. Updates payments.receipt_url to the app's authed download path.
 *   5. Deletes the old public blob — the old URL dies.
 *
 * Blobs with no matching payment row move to receipts/legacy/ (admin/
 * supervisor-visible only) rather than being destroyed.
 *
 * Also migrates avatars: re-uploads each public avatar with a random
 * suffix (they stay public — next/image fetches without credentials) and
 * deletes the old predictable {memberId}_{timestamp} URL.
 *
 * Usage (operator, once, after deploying the private-storage release):
 *   BLOB_READ_WRITE_TOKEN=... DATABASE_URL=postgres://... \
 *     node scripts/migrate-receipts-private.mjs [--dry-run]
 *
 * Idempotent: already-migrated rows (receipt_url starting /api/files/) and
 * already-random avatar URLs are skipped. Safe to re-run after a partial
 * failure.
 */
import { list, put, del } from '@vercel/blob';
import { Pool } from '@neondatabase/serverless';

const DRY = process.argv.includes('--dry-run');
const token = process.env.BLOB_READ_WRITE_TOKEN;
const dbUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!token || !dbUrl) {
  console.error('Set BLOB_READ_WRITE_TOKEN and DATABASE_URL (or DATABASE_URL_DIRECT).');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function fetchBlobBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return {
    bytes: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') ?? 'application/octet-stream',
  };
}

async function migrateReceipts() {
  let cursor;
  let moved = 0, legacy = 0, skipped = 0;
  do {
    const page = await list({ prefix: 'receipts/', token, cursor });
    cursor = page.cursor;
    for (const blob of page.blobs) {
      // Already under a member folder → already migrated shape.
      if (/^receipts\/[0-9a-f-]{36}\//i.test(blob.pathname) || blob.pathname.startsWith('receipts/legacy/')) {
        skipped++;
        continue;
      }
      const { rows } = await pool.query(
        'SELECT id, member_id FROM payments WHERE receipt_url = $1 LIMIT 1', [blob.url],
      );
      const owner = rows[0]?.member_id ?? null;
      const filename = blob.pathname.split('/').pop();
      const targetKey = owner ? `receipts/${owner}/${filename}` : `receipts/legacy/${filename}`;

      console.log(`${DRY ? '[dry] ' : ''}${blob.pathname} → ${targetKey}${owner ? '' : ' (no payment row — legacy)'}`);
      if (DRY) { owner ? moved++ : legacy++; continue; }

      const { bytes, contentType } = await fetchBlobBytes(blob.url);
      const put2 = await put(targetKey, bytes, {
        access: 'private', contentType, token, addRandomSuffix: true,
      });
      if (rows[0]) {
        await pool.query(
          'UPDATE payments SET receipt_url = $1 WHERE id = $2',
          [`/api/files/${put2.pathname}`, rows[0].id],
        );
      }
      await del(blob.url, { token });
      owner ? moved++ : legacy++;
    }
  } while (cursor);
  console.log(`receipts: ${moved} moved to owners, ${legacy} to legacy/, ${skipped} already migrated`);
}

async function migrateAvatars() {
  let cursor;
  let moved = 0, skipped = 0;
  do {
    const page = await list({ prefix: 'avatars/', token, cursor });
    cursor = page.cursor;
    for (const blob of page.blobs) {
      // Predictable legacy names look like avatars/<uuid>_<timestamp>.<ext>.
      const legacyName = /^avatars\/[0-9a-f-]{36}_\d+\.\w+$/i.test(blob.pathname);
      if (!legacyName) { skipped++; continue; }

      const { rows } = await pool.query(
        'SELECT id FROM members WHERE photo_url = $1 LIMIT 1', [blob.url],
      );
      console.log(`${DRY ? '[dry] ' : ''}${blob.pathname} → random-suffix public${rows[0] ? '' : ' (orphan — deleting)'}`);
      if (DRY) { moved++; continue; }

      if (rows[0]) {
        const { bytes, contentType } = await fetchBlobBytes(blob.url);
        const put2 = await put('avatars/avatar', bytes, {
          access: 'public', contentType, token, addRandomSuffix: true,
        });
        await pool.query('UPDATE members SET photo_url = $1 WHERE id = $2', [put2.url, rows[0].id]);
      }
      await del(blob.url, { token });
      moved++;
    }
  } while (cursor);
  console.log(`avatars: ${moved} re-keyed, ${skipped} already unguessable`);
}

try {
  await migrateReceipts();
  await migrateAvatars();
  console.log(DRY ? 'Dry run complete — nothing changed.' : 'Migration complete.');
} finally {
  await pool.end();
}

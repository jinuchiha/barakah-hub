/**
 * Backfill `members` rows for Better-Auth users that registered via the
 * mobile app but never got onboarded. Each gets a pending row with
 * status='pending' so admins can see + approve them in /admin/members.
 *
 * Safe to re-run: skips users that already have a member row.
 */
import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

async function main() {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  const pool = new Pool({ connectionString: url });

  const { rows: orphans } = await pool.query(`
    SELECT u.id AS auth_id, u.email, u.name, u.created_at
    FROM users u
    LEFT JOIN members m ON m.auth_id = u.id
    WHERE m.id IS NULL
    ORDER BY u.created_at ASC
  `);

  if (orphans.length === 0) {
    console.log('No orphans found.');
    await pool.end();
    return;
  }

  console.log(`Found ${orphans.length} orphan(s). Creating pending member rows...\n`);

  for (const o of orphans) {
    // Generate a username from email (before @, lowercased, deduped if collides)
    const emailPrefix = (o.email as string).split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = emailPrefix || `user${Date.now()}`;

    // Check for username collision and disambiguate
    let attempt = 0;
    while (attempt < 10) {
      const { rows } = await pool.query(`SELECT 1 FROM members WHERE username = $1 LIMIT 1`, [username]);
      if (rows.length === 0) break;
      attempt++;
      username = `${emailPrefix}${attempt + 1}`;
    }

    const nameEn = (o.name as string | null)?.trim() || (o.email as string).split('@')[0];
    const nameUr = nameEn; // user can edit later via profile

    try {
      await pool.query(`
        INSERT INTO members (
          auth_id, username, name_en, name_ur, father_name,
          status, role, deceased, needs_setup, monthly_pledge
        ) VALUES ($1, $2, $3, $4, $5, 'pending', 'member', false, true, 1000)
      `, [o.auth_id, username, nameEn, nameUr, '—']);
      console.log(`  + Created pending member: ${nameEn} (${o.email})`);
    } catch (e) {
      console.error(`  ! Failed for ${o.email}: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }

  console.log('\nDone.');
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

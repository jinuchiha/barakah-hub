/**
 * Diagnostic — connects to the DB pointed at by DATABASE_URL and verifies
 * the columns we expect actually exist. Re-applies the migrations that
 * add missing columns. Idempotent.
 *
 * Usage:
 *   pnpm tsx scripts/verify-and-fix-schema.ts
 *
 * The script prints which DB host it's connecting to so you can confirm
 * it's the same one Vercel uses.
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set in .env / .env.local');
    process.exit(1);
  }
  // Print host (everything between '@' and the next '/') so user can confirm
  const host = url.split('@')[1]?.split('/')[0] ?? '?';
  console.log(`Connecting to host: ${host}\n`);

  const sql = neon(url);

  // 1. List all existing columns on payments
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments'
    ORDER BY ordinal_position
  `;
  const existing = new Set(cols.map((c) => c.column_name as string));
  console.log(`payments columns: ${[...existing].join(', ')}\n`);

  // 2. Apply each missing column
  const expected = [
    { name: 'receipt_url', type: 'text', migration: '0007_payments_receipt_url' },
  ];

  for (const c of expected) {
    if (existing.has(c.name)) {
      console.log(`✓ ${c.name} already exists`);
    } else {
      console.log(`⚠ ${c.name} missing — adding now…`);
      await sql.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS ${c.name} ${c.type}`);
      console.log(`✓ ${c.name} added`);
    }
  }

  // 3. Same for member_invites + push_tokens tables (created in later migrations)
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public'
  `;
  const tableSet = new Set(tables.map((t) => t.table_name as string));

  if (!tableSet.has('push_tokens')) {
    console.log('\n⚠ push_tokens table missing — creating now…');
    await sql.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        token text NOT NULL UNIQUE,
        platform text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await sql.query(`CREATE INDEX IF NOT EXISTS push_tokens_member_idx ON push_tokens (member_id)`);
    console.log('✓ push_tokens created');
  } else {
    console.log('✓ push_tokens table exists');
  }

  if (!tableSet.has('member_invites')) {
    console.log('\n⚠ member_invites table missing — creating now…');
    await sql.query(`
      CREATE TABLE IF NOT EXISTS member_invites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        token text NOT NULL UNIQUE,
        created_by_id uuid NOT NULL REFERENCES members(id),
        label text,
        max_uses integer NOT NULL DEFAULT 1,
        used_count integer NOT NULL DEFAULT 0,
        expires_at timestamptz,
        revoked boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await sql.query(`CREATE INDEX IF NOT EXISTS member_invites_token_idx ON member_invites (token)`);
    console.log('✓ member_invites created');
  } else {
    console.log('✓ member_invites table exists');
  }

  console.log('\n✓ Schema verified and fixed.');
}

main().catch((e) => { console.error(e); process.exit(1); });

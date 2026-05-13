/**
 * One-shot script — apply a single migration file to Neon.
 * Usage: pnpm tsx scripts/apply-migration.ts supabase/migrations/0007_payments_receipt_url.sql
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

const file = process.argv[2];
if (!file) {
  console.error('Usage: pnpm tsx scripts/apply-migration.ts <migration-file>');
  process.exit(1);
}

async function main() {
  const sqlText = fs.readFileSync(path.resolve(file), 'utf-8');
  // Direct connection for DDL (pooler can reject some statements).
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!;
  const sql = neon(url);

  // Split on semicolons that are at end of line — naive but works for our migrations.
  const statements = sqlText
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    console.log(`-- Executing:\n${stmt}\n`);
    await sql.query(stmt);
  }
  console.log(`✓ Applied ${file}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

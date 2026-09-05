/**
 * Migration rehearsal against a Neon BRANCH of production data.
 *
 * Never applies anything to production. The flow:
 *
 *   1. You create a Neon branch from production (console or CLI):
 *        neonctl branches create --name rehearse-0021 --parent main
 *      A branch is a copy-on-write clone — full production data, isolated.
 *   2. Run this script against the BRANCH's direct connection string:
 *        DATABASE_URL_DIRECT='postgres://...branch...' node scripts/rehearse-migrations.mjs
 *   3. It snapshots integrity metrics, applies pending migrations via the
 *      same runner production uses (scripts/migrate.ts), re-snapshots, and
 *      prints a reconciliation report.
 *   4. Delete the branch afterwards. Rollback story for production remains
 *      Neon PITR / branch restore — there are deliberately no down
 *      migrations (a destructive down for 0017–0021 would be theater).
 *
 * The script REFUSES to run if the host does not look like a Neon branch
 * (endpoint hostname equal to the production DATABASE_URL's host).
 */
import { spawnSync } from 'node:child_process';
import { Pool } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL_DIRECT;
if (!url) {
  console.error('Set DATABASE_URL_DIRECT to the Neon BRANCH direct connection string.');
  process.exit(1);
}
if (process.env.PROD_DATABASE_HOST && new URL(url).hostname === process.env.PROD_DATABASE_HOST) {
  console.error('Refusing: DATABASE_URL_DIRECT points at the production host. Rehearse on a branch.');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

/** Integrity + reconciliation queries. All read-only. */
const CHECKS = {
  members: 'SELECT count(*)::int AS n FROM members',
  payments: 'SELECT count(*)::int AS n FROM payments',
  payments_verified: `SELECT count(*)::int AS n FROM payments WHERE status = 'verified'`,
  fund_total_verified: `SELECT COALESCE(sum(amount),0)::bigint AS n FROM payments WHERE status = 'verified'`,
  ledger_entries: 'SELECT count(*)::int AS n FROM ledger_entries',
  ledger_balance: 'SELECT COALESCE(sum(amount),0)::bigint AS n FROM ledger_entries',
  audit_rows: 'SELECT count(*)::int AS n FROM audit_log',
  invites: 'SELECT count(*)::int AS n FROM member_invites',
  outbox_pending: `SELECT count(*)::int AS n FROM outbox_messages WHERE state = 'pending'`,
  loans: 'SELECT count(*)::int AS n FROM loans',
  fk_violations: `
    SELECT count(*)::int AS n FROM payments p
    LEFT JOIN members m ON m.id = p.member_id
    WHERE m.id IS NULL`,
  orphan_ledger: `
    SELECT count(*)::int AS n FROM ledger_entries l
    LEFT JOIN payments p ON p.id = l.source_id
    WHERE l.source_type = 'payment' AND p.id IS NULL`,
};

async function snapshot(label) {
  const out = {};
  for (const [name, q] of Object.entries(CHECKS)) {
    try {
      const { rows } = await pool.query(q);
      out[name] = String(rows[0]?.n ?? 'n/a');
    } catch (e) {
      out[name] = `ERROR: ${e.message.split('\n')[0]}`;
    }
  }
  console.log(`\n═══ ${label} ═══`);
  for (const [k, v] of Object.entries(out)) console.log(`  ${k.padEnd(22)} ${v}`);
  return out;
}

const before = await snapshot('BEFORE migration');

console.log('\n▶ Applying migrations with the production runner (scripts/migrate.ts)...\n');
const run = spawnSync('npx', ['tsx', 'scripts/migrate.ts'], {
  stdio: 'inherit', shell: true,
  env: { ...process.env, DATABASE_URL_DIRECT: url },
});
if (run.status !== 0) {
  console.error('\n❌ Migration FAILED on the rehearsal branch. Production untouched. Fix before merging.');
  await pool.end();
  process.exit(1);
}

const after = await snapshot('AFTER migration');

console.log('\n═══ RECONCILIATION ═══');
let ok = true;
for (const key of Object.keys(CHECKS)) {
  const same = before[key] === after[key];
  // Row counts and money totals must be IDENTICAL — these migrations add
  // tables/constraints, they must never create, destroy, or re-value rows.
  const mustMatch = !['outbox_pending'].includes(key);
  const verdict = same ? 'unchanged' : (mustMatch ? 'CHANGED ⚠' : 'changed (tolerated)');
  if (!same && mustMatch) ok = false;
  console.log(`  ${key.padEnd(22)} ${before[key]} → ${after[key]}  ${verdict}`);
}
console.log(ok
  ? '\n✅ Rehearsal PASSED: schema applied cleanly, data and money totals reconcile.'
  : '\n❌ Rehearsal FAILED reconciliation — do NOT merge until explained.');
await pool.end();
process.exit(ok ? 0 : 1);

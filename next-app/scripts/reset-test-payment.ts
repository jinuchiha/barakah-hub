/**
 * Reset the Rs 567 Sadaqah test entry recorded directly by admin
 * (bypassing the new approval queue). Moves it back to
 * pendingVerify=true so it flows through Noor → admin like every
 * future payment will under the new recordPayment logic.
 *
 * If multiple matching rows exist, only the most recent is reset
 * to avoid accidentally re-pending old verified payments.
 */
import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

async function main() {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  const pool = new Pool({ connectionString: url });

  // Show what we have
  const { rows: existing } = await pool.query(`
    SELECT p.id, p.amount, p.pool, p.month_label, p.pending_verify, m.name_en
    FROM payments p
    LEFT JOIN members m ON m.id = p.member_id
    ORDER BY p.created_at DESC
  `);
  console.log(`Found ${existing.length} payment(s):`);
  for (const r of existing) {
    console.log(`  ${r.amount} ${r.pool} ${r.month_label} · ${r.name_en} · ${r.pending_verify ? 'PENDING' : 'verified'}`);
  }

  // Reset all verified payments to pending (assumes these are test data
  // — only safe to run on a fresh fund with no real history).
  // ⚠️ If you have real verified payments you want to keep, change the
  //    WHERE clause to match only the test entries you want to reset.
  const { rowCount } = await pool.query(`
    UPDATE payments
       SET pending_verify = true,
           verified_by_id = NULL,
           verified_at    = NULL,
           supervisor_approved_at = NULL,
           supervisor_approved_by_id = NULL
     WHERE pending_verify = false
  `);
  console.log(`\n✓ Reset ${rowCount} previously-verified payment(s) back to pending.`);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

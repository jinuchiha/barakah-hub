/**
 * Permanently remove the test "tania" user (taniaasghar122@gmail.com).
 *
 * Rejected accounts were originally kept around so admins could audit
 * the rejection decision, but tania was a real signup we rejected then
 * the row kept polluting dropdowns. Delete cascades:
 *   - sessions, accounts via Better-Auth FK ON DELETE CASCADE
 *   - members.auth_id is the link — delete member row first, then user
 */
import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

const EMAIL = 'taniaasghar122@gmail.com';

async function main() {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  const pool = new Pool({ connectionString: url });

  const { rows: [user] } = await pool.query(`SELECT id, email, name FROM users WHERE email = $1`, [EMAIL]);
  if (!user) {
    console.log(`= ${EMAIL} already removed`);
    await pool.end();
    return;
  }

  // Delete dependent rows first — payments, etc. cascade via FK already.
  // members has auth_id with ON DELETE SET NULL, so we explicitly delete
  // the member row so it doesn't end up as an orphan unlinked member.
  const { rowCount: memberDel } = await pool.query(
    `DELETE FROM members WHERE auth_id = $1`,
    [user.id],
  );
  console.log(`  Member rows deleted: ${memberDel}`);

  // Sessions + accounts cascade on user delete.
  const { rowCount: userDel } = await pool.query(`DELETE FROM users WHERE id = $1`, [user.id]);
  console.log(`  Better-Auth user deleted: ${userDel} row(s)`);

  console.log(`✓ Removed ${EMAIL}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * One-off cleanup (2026-05-16) — link Noorulain's Better-Auth user to
 * the existing "Noor Ul Ain" member row, and delete the test orphan V.
 *
 * Safe to run idempotently: skips both actions if state already matches.
 */
import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

async function main() {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  const pool = new Pool({ connectionString: url });

  // 1. Link Noorulain → Noor Ul Ain
  const { rows: [authUser] } = await pool.query(
    `SELECT id, email, name FROM users WHERE email = $1`,
    ['noorubfatima@gmail.com'],
  );
  const { rows: [memberRow] } = await pool.query(
    `SELECT id, name_en, auth_id FROM members WHERE name_en ILIKE $1 OR name_en ILIKE $2`,
    ['noor%ul%ain%', 'noorulain%'],
  );

  if (!authUser) {
    console.log('! Noorulain auth user not found');
  } else if (!memberRow) {
    console.log('! Noor Ul Ain member row not found');
  } else if (memberRow.auth_id === authUser.id) {
    console.log(`= Already linked: ${memberRow.name_en} ↔ ${authUser.email}`);
  } else if (memberRow.auth_id && memberRow.auth_id !== authUser.id) {
    console.log(`! Member ${memberRow.name_en} is linked to a different auth user — manual intervention needed`);
  } else {
    await pool.query(
      `UPDATE members SET auth_id = $1, needs_setup = false WHERE id = $2`,
      [authUser.id, memberRow.id],
    );
    console.log(`+ Linked ${memberRow.name_en} ↔ ${authUser.email}`);

    // Audit trail
    await pool.query(
      `INSERT INTO audit_log (actor_id, action, detail, target_id)
       VALUES (NULL, 'member-edited', $1, $2)`,
      [`Linked Noorulain (${authUser.email}) to member row ${memberRow.id}`, memberRow.id],
    );
  }

  // 2. Delete V test user
  const { rows: [vUser] } = await pool.query(
    `SELECT id, email, name FROM users WHERE email = $1`,
    ['verify-fix-aaa@example.com'],
  );
  if (!vUser) {
    console.log('= V test user already removed');
  } else {
    // Delete any orphaned member row first (idempotent — none exists for V)
    await pool.query(`DELETE FROM members WHERE auth_id = $1`, [vUser.id]);
    // Sessions/accounts cascade-delete via FK
    await pool.query(`DELETE FROM users WHERE id = $1`, [vUser.id]);
    console.log(`+ Deleted V test user (${vUser.email})`);
  }

  console.log('\nDone.');
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

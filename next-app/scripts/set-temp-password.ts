/**
 * One-off admin operations (2026-05-16) for Noor Ul Ain:
 *   1. Set role = 'supervisor' (fund collector — see auth-server.ts
 *      canManageFunds for what they can/can't do).
 *   2. Reset password to a known temporary value so admin can hand it
 *      over for first login. User should rotate via Profile → Change
 *      Password immediately.
 *
 * Uses better-auth's own hashPassword so the hash matches what
 * verifyPassword expects on sign-in (otherwise login would silently
 * fail despite the DB row being updated).
 */
import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import { hashPassword } from 'better-auth/crypto';

const EMAIL = 'noorubfatima@gmail.com';
const TEMP_PASSWORD = 'Barakah@2026';
const NEW_ROLE = 'supervisor';

async function main() {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  const pool = new Pool({ connectionString: url });

  const { rows: [user] } = await pool.query(`SELECT id, email FROM users WHERE email = $1`, [EMAIL]);
  if (!user) { console.error(`! User ${EMAIL} not found`); await pool.end(); process.exit(1); }

  // 1. Role promotion
  const { rows: memberRows } = await pool.query(
    `UPDATE members SET role = $1, updated_at = now() WHERE auth_id = $2 RETURNING id, name_en, role`,
    [NEW_ROLE, user.id],
  );
  if (memberRows.length === 0) {
    console.error('! No member row linked to this auth user');
  } else {
    console.log(`✓ Role set: ${memberRows[0].name_en} → ${memberRows[0].role}`);
    await pool.query(
      `INSERT INTO audit_log (actor_id, action, detail, target_id)
       VALUES (NULL, 'member-edited', $1, $2)`,
      [`Role changed to ${NEW_ROLE} for ${user.email}`, memberRows[0].id],
    );
  }

  // 2. Password reset
  const { rows: accounts } = await pool.query(
    `SELECT id, provider_id FROM accounts WHERE user_id = $1`,
    [user.id],
  );
  const credentialAccount = accounts.find((a: { provider_id: string }) =>
    ['credential', 'email', 'credentials'].includes(a.provider_id),
  );
  if (!credentialAccount) {
    console.error('! No email/password account found for this user');
    await pool.end();
    process.exit(1);
  }
  const hash = await hashPassword(TEMP_PASSWORD);
  await pool.query(
    `UPDATE accounts SET password = $1, updated_at = now() WHERE id = $2`,
    [hash, credentialAccount.id],
  );
  await pool.query(
    `INSERT INTO audit_log (actor_id, action, detail, target_id)
     VALUES (NULL, 'password-reset', $1, NULL)`,
    [`Admin temporary password set for ${user.email}`],
  );

  console.log(`\n✓ Temporary password set for ${user.email}: ${TEMP_PASSWORD}`);
  console.log('  Share with user; ask them to change via Profile → Change Password.');

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

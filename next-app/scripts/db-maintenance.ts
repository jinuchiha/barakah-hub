/**
 * Admin maintenance tasks for the DB-maintenance GitHub workflow.
 *
 *   verify       — print whether the latest migration's columns exist
 *   e2e-approve  — approve the throwaway E2E account
 *   e2e-promote  — make it an admin for admin-surface tests
 *   e2e-cleanup  — remove every trace of it (payments, notifications,
 *                  member, auth rows)
 *
 * The e2e-* tasks refuse any email outside @barakah-test.dev, so this
 * can never touch a real member.
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL_DIRECT not set');
const sql = neon(url);

const [task, email] = process.argv.slice(2);

function assertTestEmail(): string {
  if (!email || !/^[a-z0-9.+-]+@barakah-test\.dev$/i.test(email)) {
    throw new Error('e2e tasks require an @barakah-test.dev email');
  }
  return email;
}

async function memberByEmail(e: string) {
  const rows = await sql`
    SELECT m.id FROM members m JOIN users u ON u.id = m.auth_id
    WHERE u.email = ${e} LIMIT 1`;
  return (rows[0] as { id: string } | undefined)?.id;
}

async function main() {
  if (task === 'verify') {
    const loans = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='loans' AND column_name='installment_amount'`;
    const cfg = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='config' AND column_name='fauti_amount'`;
    const members = await sql`SELECT COUNT(*)::int AS n FROM members`;
    console.log('loans.installment_amount:', loans.length ? 'EXISTS' : 'MISSING');
    console.log('config.fauti_amount:', cfg.length ? 'EXISTS' : 'MISSING');
    console.log('members:', JSON.stringify(members[0]));
    if (!loans.length || !cfg.length) process.exit(2);
  } else if (task === 'e2e-approve') {
    const id = await memberByEmail(assertTestEmail());
    if (!id) throw new Error('member not found');
    await sql`UPDATE members SET status='approved' WHERE id=${id}`;
    console.log('approved');
  } else if (task === 'e2e-promote') {
    const id = await memberByEmail(assertTestEmail());
    if (!id) throw new Error('member not found');
    await sql`UPDATE members SET role='admin' WHERE id=${id}`;
    console.log('promoted', id);
  } else if (task === 'e2e-cleanup') {
    const e = assertTestEmail();
    const id = await memberByEmail(e);
    if (id) {
      await sql`DELETE FROM payments WHERE member_id=${id}`;
      await sql`DELETE FROM notifications WHERE recipient_id=${id}`;
      await sql`DELETE FROM notifications WHERE en LIKE '%ZZ Smoke%' OR ur LIKE '%ZZ Smoke%'`;
      await sql`DELETE FROM push_tokens WHERE member_id=${id}`;
      await sql`UPDATE members SET spouse_id=NULL WHERE spouse_id=${id}`;
      try {
        await sql`DELETE FROM members WHERE id=${id}`;
        console.log('member deleted');
      } catch {
        await sql`UPDATE members SET status='rejected', name_en='ZZ (test, safe to ignore)' WHERE id=${id}`;
        console.log('member delete blocked by audit FK; marked rejected');
      }
    }
    const users = await sql`SELECT id FROM users WHERE email=${e}`;
    if (users[0]) {
      const uid = (users[0] as { id: string }).id;
      await sql`DELETE FROM sessions WHERE user_id=${uid}`;
      await sql`DELETE FROM accounts WHERE user_id=${uid}`;
      await sql`DELETE FROM users WHERE id=${uid}`;
      console.log('auth rows deleted');
    }
    console.log('cleanup complete');
  } else {
    throw new Error(`unknown task "${task}"`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

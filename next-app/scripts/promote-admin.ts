/**
 * One-shot script — promote a member to admin + approved status.
 * Usage: pnpm tsx scripts/promote-admin.ts <email>
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const email = process.argv[2];
if (!email) {
  console.error('Usage: pnpm tsx scripts/promote-admin.ts <email>');
  process.exit(1);
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  const userRows = await sql`SELECT id, email FROM users WHERE email = ${email} LIMIT 1`;
  if (userRows.length === 0) {
    console.error(`No Better-Auth user found for ${email}`);
    process.exit(1);
  }
  const userId = userRows[0].id as string;
  console.log(`✓ Found Better-Auth user ${userId}`);

  const memberRows = await sql`
    UPDATE members
    SET role = 'admin', status = 'approved', needs_setup = false, updated_at = now()
    WHERE auth_id = ${userId}
    RETURNING id, name_en, role, status
  `;

  if (memberRows.length === 0) {
    console.error(`No member row found for auth_id ${userId} — did you complete onboarding?`);
    process.exit(1);
  }

  const m = memberRows[0];
  console.log(`✓ Promoted member ${m.id} (${m.name_en}) → role=${m.role}, status=${m.status}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

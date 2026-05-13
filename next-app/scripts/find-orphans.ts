import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

async function main() {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) { console.error('No DATABASE_URL'); process.exit(1); }
  const pool = new Pool({ connectionString: url });

  console.log('\n=== ALL USERS in Better-Auth users table ===');
  const allUsers = await pool.query(`
    SELECT id, email, name, created_at
    FROM users
    ORDER BY created_at DESC
  `);
  console.log(`Total: ${allUsers.rows.length}`);
  for (const u of allUsers.rows) {
    console.log(`  ${u.created_at?.toISOString?.() ?? u.created_at}  ${u.email}  (${u.name ?? '-'})`);
  }

  console.log('\n=== ALL MEMBERS rows ===');
  const allMembers = await pool.query(`
    SELECT id, auth_id, name_en, name_ur, status, role, created_at
    FROM members
    ORDER BY created_at DESC
  `);
  console.log(`Total: ${allMembers.rows.length}`);
  for (const m of allMembers.rows) {
    console.log(`  ${m.created_at?.toISOString?.() ?? m.created_at}  [${m.status}/${m.role}]  ${m.name_en || m.name_ur}  auth=${m.auth_id?.slice(0, 8) ?? 'unlinked'}`);
  }

  console.log('\n=== ORPHANS — users with NO member row (registered but never onboarded) ===');
  const orphans = await pool.query(`
    SELECT u.id, u.email, u.name, u.created_at
    FROM users u
    LEFT JOIN members m ON m.auth_id = u.id
    WHERE m.id IS NULL
    ORDER BY u.created_at DESC
  `);
  if (orphans.rows.length === 0) {
    console.log('  (none)');
  } else {
    console.log(`Total orphans: ${orphans.rows.length}`);
    for (const o of orphans.rows) {
      console.log(`  ${o.created_at?.toISOString?.() ?? o.created_at}  ${o.email}  (${o.name ?? '-'})`);
    }
  }

  console.log('\n=== PENDING MEMBERS (status=pending) — these should show in admin panel ===');
  const pending = allMembers.rows.filter((m: { status: string }) => m.status === 'pending');
  if (pending.length === 0) {
    console.log('  (none)');
  } else {
    for (const m of pending) {
      console.log(`  ${m.created_at?.toISOString?.() ?? m.created_at}  ${m.name_en || m.name_ur}`);
    }
  }

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL must be set in .env');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: url });

  // 1. Total users
  const { rows: userCount } = await pool.query('SELECT COUNT(*) as count FROM users');
  console.log(`Total users (Auth): ${userCount[0].count}`);

  // 2. Total members
  const { rows: memberCount } = await pool.query('SELECT COUNT(*) as count FROM members');
  console.log(`Total members: ${memberCount[0].count}`);

  // 3. Status breakdown
  const { rows: statusCounts } = await pool.query('SELECT status, COUNT(*) as count FROM members GROUP BY status');
  console.log('\nStatus Breakdown:');
  statusCounts.forEach(r => console.log(` - ${r.status}: ${r.count}`));

  // 4. Role breakdown
  const { rows: roleCounts } = await pool.query('SELECT role, COUNT(*) as count FROM members GROUP BY role');
  console.log('\nRole Breakdown:');
  roleCounts.forEach(r => console.log(` - ${r.role}: ${r.count}`));

  // 5. Deceased breakdown
  const { rows: deceasedCounts } = await pool.query('SELECT deceased, COUNT(*) as count FROM members GROUP BY deceased');
  console.log('\nDeceased Breakdown:');
  deceasedCounts.forEach(r => console.log(` - ${r.deceased ? 'Deceased' : 'Alive'}: ${r.count}`));

  await pool.end();
}

main().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
});

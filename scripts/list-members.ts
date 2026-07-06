import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL must be set in .env');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: url });

  const { rows } = await pool.query(`
    SELECT m.username, m.name_en, m.name_ur, m.role, m.status,
           m.phone, m.city, u.email
    FROM members m
    LEFT JOIN users u ON u.id = m.auth_id
    ORDER BY m.role, m.name_en
  `);

  console.log(`Total members: ${rows.length}\n`);
  console.table(
    rows.map((r) => ({
      username: r.username,
      email: r.email ?? '—',
      name: r.name_en,
      role: r.role,
      status: r.status,
      phone: r.phone ?? '—',
      city: r.city ?? '—',
    }))
  );

  await pool.end();
}

main().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});

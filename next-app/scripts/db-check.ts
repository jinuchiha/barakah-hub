import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

async function main() {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const pool = new Pool({ connectionString: url });

  const { rows } = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  console.log(`Tables in public (${rows.length}):`);
  for (const r of rows) console.log(`  · ${r.tablename}`);

  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });

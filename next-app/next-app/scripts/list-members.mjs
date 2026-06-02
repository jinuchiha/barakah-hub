import { readFileSync } from 'node:fs';
import { Pool } from '@neondatabase/serverless';

function envFromFiles() {
  for (const f of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(f, 'utf8').split('\n')) {
        const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
        if (m) return m[1].replace(/^["']|["']$/g, '');
      }
    } catch {}
  }
  return process.env.DATABASE_URL;
}

const url = envFromFiles();
if (!url) { console.error('DATABASE_URL not found'); process.exit(1); }

const pool = new Pool({ connectionString: url });
const { rows } = await pool.query(`
  SELECT m.username, m.name_en, m.role, m.status, m.phone, m.city, u.email
  FROM members m
  LEFT JOIN users u ON u.id = m.auth_id
  ORDER BY m.role, m.name_en
`);
console.log(`Total members: ${rows.length}\n`);
console.table(rows.map((r) => ({
  username: r.username, email: r.email ?? '—', name: r.name_en,
  role: r.role, status: r.status, phone: r.phone ?? '—', city: r.city ?? '—',
})));
await pool.end();

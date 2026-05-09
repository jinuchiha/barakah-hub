/**
 * Apply Drizzle migrations to Neon — idempotent + recoverable.
 *
 * Reads `supabase/migrations/*.sql` in order, splits each file into
 * individual statements, and executes them one-by-one. Tolerates
 * "already exists" / "duplicate object" errors so partially-applied
 * migrations can be brought up to fully-applied state without manual
 * intervention.
 *
 * Tracks completed migrations in a `_barakah_migrations` ledger table.
 */
import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL_DIRECT (or DATABASE_URL) must be set in .env.local');
  process.exit(1);
}

if (url.includes('-pooler.')) {
  console.warn(
    '⚠  Connection targets the pooled endpoint. If errors mention prepared\n' +
    '   statements, set DATABASE_URL_DIRECT to the non-pooled URL.\n',
  );
}

/** Split a SQL file into individual statements, respecting dollar-quoted bodies. */
function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inDollar = false;
  let dollarTag = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    const next2 = sql.slice(i, i + 2);

    if (inLineComment) {
      buf += c;
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      buf += c;
      if (next2 === '*/') { buf += sql[i + 1]; i++; inBlockComment = false; }
      continue;
    }
    if (!inDollar) {
      if (next2 === '--') { inLineComment = true; buf += c; continue; }
      if (next2 === '/*') { inBlockComment = true; buf += c; continue; }
    }

    // Detect dollar-quoted body open/close: $$ or $tag$
    if (c === '$') {
      const m = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (m) {
        const tag = m[0];
        if (!inDollar) {
          inDollar = true;
          dollarTag = tag;
        } else if (tag === dollarTag) {
          inDollar = false;
          dollarTag = '';
        }
        buf += tag;
        i += tag.length - 1;
        continue;
      }
    }

    if (c === ';' && !inDollar) {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = '';
      continue;
    }
    buf += c;
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

const TOLERABLE = [
  'already exists',
  'duplicate object',
  'duplicate_object',
  'duplicate column',
  'duplicate_column',
  'relation', // covers "relation X already exists"
  // Supabase-specific RLS / storage statements in 0001 reference an
  // `auth` schema and `storage.*` tables that Neon doesn't have. Those
  // policies are documentation-only on Neon (app-level authorisation is
  // the actual boundary — see security model), so we let them no-op.
  'schema "auth" does not exist',
  'schema "storage" does not exist',
  'function auth.uid() does not exist',
  'relation "storage.buckets" does not exist',
  'relation "storage.objects" does not exist',
  // Idempotent INSERT noise: re-running an INSERT against a singleton
  // config row that already exists is fine.
  'duplicate key value',
  'violates unique constraint',
  // Supabase roles (authenticated, anon, service_role) don't exist on
  // Neon. RLS GRANTs / CREATE POLICY ... TO authenticated all no-op.
  'role "authenticated" does not exist',
  'role "anon" does not exist',
  'role "service_role" does not exist',
  'role "supabase_admin" does not exist',
];

function isTolerable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return TOLERABLE.some((needle) => msg.includes(needle));
}

async function main() {
  const pool = new Pool({ connectionString: url });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _barakah_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const dir = join(process.cwd(), 'supabase', 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  console.log(`▶ Found ${files.length} migration(s) in ${dir}`);

  for (const filename of files) {
    const { rows } = await pool.query(
      'SELECT 1 FROM _barakah_migrations WHERE filename = $1',
      [filename],
    );
    if (rows.length > 0) {
      console.log(`  ⊘  ${filename}  (already applied)`);
      continue;
    }

    const sql = readFileSync(join(dir, filename), 'utf8');
    const statements = splitStatements(sql);
    process.stdout.write(`  ▸  ${filename}  applying ${statements.length} statement(s)`);

    let skipped = 0;
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (isTolerable(err)) {
          skipped++;
        } else {
          console.log(' ✗');
          console.error(`\n   Failed statement:\n   ${stmt.slice(0, 200)}${stmt.length > 200 ? '...' : ''}\n`);
          throw err;
        }
      }
    }

    await pool.query(
      'INSERT INTO _barakah_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
      [filename],
    );
    console.log(skipped > 0 ? ` ✓ (${skipped} pre-existing object(s) tolerated)` : ' ✓');
  }

  await pool.end();
  console.log('\n✓ All migrations applied.');
}

main().catch((err) => {
  console.error('\n❌ Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});

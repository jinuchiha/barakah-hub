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
import { splitStatements, isTolerable } from './migration-sql';

/**
 * Resolve the connection at call time, not module load, so the pure helpers
 * below (`splitStatements`, `isTolerable`) can be imported and unit-tested
 * without the module exiting the process on import.
 */
function resolveUrl(): string {
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
  return url;
}

async function main() {
  const pool = new Pool({ connectionString: resolveUrl() });
  // A transaction must run on ONE connection. pool.query() may hand out a
  // different connection per call, which would silently scatter BEGIN /
  // SAVEPOINT / COMMIT across sessions — so take a dedicated client.
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _barakah_migrations (
        filename    TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const dir = join(process.cwd(), 'supabase', 'migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

    console.log(`▶ Found ${files.length} migration(s) in ${dir}`);

    for (const filename of files) {
      const { rows } = await client.query(
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

      // One transaction per FILE. Previously every statement ran in its own
      // implicit transaction, so a failure partway through left the earlier
      // statements committed while the ledger still reported the migration
      // as unapplied — a half-migrated schema no re-run could reliably
      // repair. Now a file applies completely or not at all.
      //
      // The ledger insert is inside that same transaction, so "recorded as
      // applied" and "actually applied" can never disagree.
      //
      // Tolerated statements need a savepoint: in Postgres any error aborts
      // the enclosing transaction, so skipping one means rolling back to a
      // point taken immediately before it.
      let skipped = 0;
      await client.query('BEGIN');
      try {
        for (const stmt of statements) {
          await client.query('SAVEPOINT stmt');
          try {
            await client.query(stmt);
            await client.query('RELEASE SAVEPOINT stmt');
          } catch (err) {
            if (isTolerable(err, stmt)) {
              skipped++;
              await client.query('ROLLBACK TO SAVEPOINT stmt');
              await client.query('RELEASE SAVEPOINT stmt');
            } else {
              console.log(' ✗');
              console.error(`
   Failed statement:
   ${stmt.slice(0, 200)}${stmt.length > 200 ? '...' : ''}
`);
              throw err;
            }
          }
        }

        await client.query(
          'INSERT INTO _barakah_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
          [filename],
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error(`   ${filename} rolled back — no statement from this file was applied.
`);
        throw err;
      }
      console.log(skipped > 0 ? ` ✓ (${skipped} pre-existing object(s) tolerated)` : ' ✓');
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n✓ All migrations applied.');
}

main().catch((err) => {
  console.error('\n❌ Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});

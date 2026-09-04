import { Client } from 'pg';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitStatements, isTolerable } from '../../scripts/migration-sql';

/**
 * Integration-test harness: a real Postgres, with the real migrations applied.
 *
 * Why this exists. Every other test in this repo mocks the database, which
 * makes them fast and lets them prove the guard logic — but it also means
 * they are structurally blind to the entire class of defect that turned out
 * to matter most. The audit's worst finding (hardDeleteMember always failing
 * on a foreign key, after already mutating) was invisible to a mocked suite
 * because the mock has no foreign keys. So were the audit-log triggers: the
 * migration test asserts the SQL *declares* a TRUNCATE trigger, not that the
 * trigger *blocks* anything.
 *
 * These tests exercise Postgres semantics — constraints, triggers, cascades,
 * transaction rollback — against the schema the migrations actually produce.
 *
 * Connection comes from INTEGRATION_DATABASE_URL. When it is unset the suites
 * skip with a message rather than failing, so `pnpm test` stays runnable on a
 * machine with no Postgres. CI provides a postgres:16 service.
 */

export const INTEGRATION_URL = process.env.INTEGRATION_DATABASE_URL;
export const hasDb = Boolean(INTEGRATION_URL);

/** Reason shown when a suite skips, so a silent skip is never mistaken for a pass. */
export const SKIP_REASON =
  'INTEGRATION_DATABASE_URL is not set — skipping real-database tests. ' +
  'CI runs these against its postgres service.';

export async function connect(): Promise<Client> {
  const client = new Client({ connectionString: INTEGRATION_URL });
  await client.connect();
  return client;
}

/**
 * Apply every migration to a fresh schema.
 *
 * Runs against a dedicated schema rather than `public` so a test run cannot
 * touch anything else in the database, and so each run starts clean. Uses the
 * SAME splitter and error-tolerance rules as scripts/migrate.ts, so a
 * migration that would break the real runner breaks here too.
 */
export async function applyMigrations(client: Client, schemaName = 'bh_test'): Promise<void> {
  await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
  await client.query(`CREATE SCHEMA ${schemaName}`);
  await client.query(`SET search_path TO ${schemaName}`);
  // gen_random_uuid() lives in pgcrypto on older servers; on 13+ it is
  // built in. Create the extension in the public schema if it is missing.
  await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto').catch(() => {});

  const dir = join(process.cwd(), 'supabase', 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const filename of files) {
    const sql = readFileSync(join(dir, filename), 'utf8');
    for (const stmt of splitStatements(sql)) {
      try {
        await client.query(stmt);
      } catch (err) {
        if (isTolerable(err, stmt)) continue;
        throw new Error(
          `Migration ${filename} failed on:\n${stmt.slice(0, 300)}\n\n${(err as Error).message}`,
        );
      }
    }
  }
}

/** Insert a minimal member and return its id. */
export async function makeMember(
  client: Client,
  opts: Partial<{ username: string; role: string; status: string; parentId: string | null }> = {},
): Promise<string> {
  const username = opts.username ?? `m_${Math.random().toString(36).slice(2, 10)}`;
  const { rows } = await client.query(
    `INSERT INTO members (username, name_ur, name_en, father_name, role, status, parent_id)
     VALUES ($1, $2, $3, 'Father', $4, $5, $6) RETURNING id`,
    [username, username, username, opts.role ?? 'member', opts.status ?? 'approved', opts.parentId ?? null],
  );
  return rows[0].id as string;
}

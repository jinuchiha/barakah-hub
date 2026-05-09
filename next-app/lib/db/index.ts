/**
 * Postgres client — Neon HTTP driver via Drizzle.
 *
 * Why neon-http and not postgres-js?
 *  - Cloudflare Workers run on V8 isolates with no persistent TCP sockets.
 *    The HTTP driver is fetch-based, single-round-trip, and stateless.
 *  - One client per Worker invocation — no connection pool to warm up.
 *  - DATABASE_URL points at the **pooled** Neon endpoint (`-pooler` host).
 *    DATABASE_URL_DIRECT (without `-pooler`) is reserved for migrations,
 *    which Drizzle Kit reads from drizzle.config.ts.
 *
 * Trade-off vs postgres-js: neon-http does NOT support multi-statement
 * transactions in a single round-trip. The four server actions that
 * issue paired writes (`castVote`, `recordRepayment`, `approveMember`,
 * `broadcastNotification`) are designed to be retry-safe — see
 * docs/MIGRATING_TO_NEON.md "Transaction gap" section.
 */
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Fail at module-load. The previous warn-then-! pattern lied to
  // TypeScript and crashed at first query with a confusing message.
  throw new Error(
    'DATABASE_URL must be set. Use the Neon pooled connection string ' +
    '(includes `-pooler` in hostname).',
  );
}

// Reuse the same SQL function across hot reloads in dev to avoid noise
const globalForDb = globalThis as unknown as {
  neonSql: ReturnType<typeof neon> | undefined;
};

const sql = globalForDb.neonSql ?? neon(connectionString);
if (process.env.NODE_ENV !== 'production') globalForDb.neonSql = sql;

export const db = drizzle(sql, { schema });
export { schema };

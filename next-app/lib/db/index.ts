/**
 * Postgres clients — two drivers, one vendor, one package.
 *
 * `db` — neon-http. Fetch-based, stateless, one round-trip per query. This is
 * the right shape for reads on a serverless platform: nothing to warm up, no
 * socket to keep alive. It is what almost every query in the app uses.
 *
 * `txDb` — neon-serverless (WebSocket). Slower to establish, but it speaks the
 * real Postgres wire protocol and therefore supports MULTI-STATEMENT
 * TRANSACTIONS, which neon-http cannot do at all.
 *
 * Why both, and why this matters:
 *
 *   Every mutation in this app is a sequence of independent writes — change
 *   the state, then append the audit row, then write notifications. On
 *   neon-http each of those is its own implicit transaction, so any of them
 *   can fail alone. That is what made the audit trail best-effort rather than
 *   guaranteed: a payment could be verified with no record of who verified
 *   it, and nothing would ever notice.
 *
 *   The individual guards added earlier (conditional UPDATEs, the weekly
 *   reconcile) protect against DOUBLE writes. They do nothing about PARTIAL
 *   ones. Only a transaction does.
 *
 * So: reads and single-statement writes stay on `db`. Anything that changes
 * money, membership or permissions goes through `inTransaction()`, where the
 * state change and its audit row commit together or not at all.
 *
 * DATABASE_URL points at the POOLED Neon endpoint. That is PgBouncer in
 * transaction-pooling mode, which supports explicit BEGIN/COMMIT — it is
 * session-level features (prepared statements, advisory locks, SET) that it
 * does not. We use none of those. Migrations, which do need them, run on
 * DATABASE_URL_DIRECT via scripts/migrate.ts.
 */
import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import { neon, neonConfig, Pool } from '@neondatabase/serverless';
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

/**
 * The WebSocket driver needs a WebSocket implementation. Node 22+ ships one
 * globally, which is what CI (node-version: 22) and the Vercel Node runtime
 * both provide. We deliberately do NOT reach for the `ws` package: it is only
 * present transitively here, and with `shamefully-hoist=false` importing a
 * transitive dependency would resolve locally and fail in a clean install.
 *
 * If the global is missing we say so plainly rather than failing later with
 * an opaque connection error.
 */
if (typeof WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = WebSocket;
} else {
  throw new Error(
    'No global WebSocket. Transactional database access requires Node 22+. ' +
    'Check the runtime version in CI (node-version) and on Vercel.',
  );
}

/**
 * Both clients are cached on globalThis — in production too, not just dev.
 *
 * For the HTTP client that only avoids hot-reload noise. For the Pool it is
 * load-bearing: a serverless instance serves many invocations, and building a
 * fresh WebSocket pool per request would pay the connection cost every time
 * and leak sockets. One pool per instance, reused, never explicitly ended —
 * the platform reclaims it when it reclaims the instance.
 */
const globalForDb = globalThis as unknown as {
  neonSql?: ReturnType<typeof neon>;
  neonPool?: Pool;
};

const sql = globalForDb.neonSql ?? neon(connectionString);
globalForDb.neonSql = sql;

const pool = globalForDb.neonPool ?? new Pool({
  connectionString,
  // A single serverless instance handles few concurrent requests; a large
  // pool would just hold idle connections against Neon's limit.
  max: 4,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});
globalForDb.neonPool = pool;

export const db = drizzle(sql, { schema });

/** Transaction-capable client. Prefer `inTransaction()` over using directly. */
export const txDb = drizzleWs(pool, { schema });

/** The handle passed to an `inTransaction` callback. */
export type Tx = Parameters<Parameters<typeof txDb.transaction>[0]>[0];

/**
 * Run `fn` inside a single database transaction.
 *
 * Use this for EVERY operation that changes state and appends an audit row —
 * which is every mutation in app/actions.ts. Either both land or neither
 * does, so "the money moved but nobody recorded it" stops being reachable.
 *
 * Throwing anywhere inside rolls the whole thing back, so guard clauses can
 * simply throw: no compensating cleanup, no half-applied state.
 *
 *   await inTransaction(async (tx) => {
 *     const [p] = await tx.insert(payments).values(...).returning();
 *     await tx.insert(auditLog).values({ ... });
 *     return p;
 *   });
 *
 * Do NOT put slow external calls (email, WhatsApp, push) inside — they would
 * hold a database connection open for the length of an HTTP request to a
 * third party. Those belong in `runAfterResponse()` after the commit.
 */
export function inTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return txDb.transaction(fn);
}

export { schema };

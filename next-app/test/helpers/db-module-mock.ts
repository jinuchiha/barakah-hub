/**
 * Shared mock of the `@/lib/db` module for server-action tests.
 *
 * Actions now run their state change and audit row inside `inTransaction()`.
 * Tests must therefore mock the whole module surface, not just `db` — and the
 * transaction has to actually invoke its callback, otherwise every mutation
 * would silently no-op and the tests would pass while testing nothing.
 *
 * The callback receives the same chainable mock as `db`, so a test writes its
 * `selectQueue` / `insertResult` fixtures once and they serve both the queries
 * made outside the transaction and those made inside it.
 */
type DbHolder = { instance: unknown };

export function makeDbModuleMock(dbMock: DbHolder) {
  return {
    get db() { return dbMock.instance; },
    get txDb() { return dbMock.instance; },
    get schema() { return {}; },
    /**
     * Runs the callback against the same mock. Rollback is not simulated:
     * these are unit tests of the guard logic, and a thrown error propagates
     * exactly as it would from a real rolled-back transaction. Whether the
     * database actually rolls back is proven by the integration tests that
     * run against real Postgres, not here.
     */
    inTransaction: <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn(dbMock.instance),
  };
}

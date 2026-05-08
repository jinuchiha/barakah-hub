import { vi } from 'vitest';

/**
 * Chainable, thenable mock that simulates Drizzle's query builder.
 * Each method returns a new mock that ultimately resolves to `result`.
 *
 * Usage:
 *   const mock = makeQuery([{ id: '1', role: 'admin' }]);
 *   await db.select().from(t).where(...).limit(1); // → [{ id: '1', role: 'admin' }]
 */
export function makeQuery<T>(result: T): Promise<T> & Record<string, unknown> {
  const builder = Promise.resolve(result) as Promise<T> & Record<string, unknown>;
  for (const m of [
    'from', 'where', 'limit', 'orderBy', 'groupBy', 'set', 'values',
    'returning', 'select', 'insert', 'update', 'delete', 'onConflictDoNothing',
    'leftJoin', 'innerJoin', 'rightJoin', 'fullJoin',
  ]) {
    builder[m] = vi.fn(() => makeQuery(result));
  }
  return builder;
}

/**
 * Build a mocked db object where each top-level method returns a chainable.
 * Provide return values per call by passing the result for the *first* terminal
 * await. For multiple distinct queries, pass `useResults` and consume in order.
 */
export function makeDbMock(opts: {
  selectResult?: unknown;
  insertResult?: unknown;
  updateResult?: unknown;
  deleteResult?: unknown;
  countResult?: number;
  selectQueue?: unknown[];
}) {
  const queue = opts.selectQueue ? [...opts.selectQueue] : null;
  return {
    select: vi.fn(() => makeQuery(queue ? queue.shift() : (opts.selectResult ?? []))),
    selectDistinct: vi.fn(() => makeQuery(queue ? queue.shift() : (opts.selectResult ?? []))),
    insert: vi.fn(() => makeQuery(opts.insertResult ?? [])),
    update: vi.fn(() => makeQuery(opts.updateResult ?? [])),
    delete: vi.fn(() => makeQuery(opts.deleteResult ?? [])),
    $count: vi.fn(async () => opts.countResult ?? 0),
  };
}

/** Mock of `createClient` from `@/lib/supabase/server`. */
export function makeSupabaseMock(user: { id: string; email?: string } | null) {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
    },
  };
}

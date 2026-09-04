/**
 * Unit tests for the outbox queue mechanics and the backoff schedule.
 *
 * The database-level guarantees (dedupe uniqueness, the sent/sent_at shape
 * constraint, SKIP LOCKED behaviour) are proven against real Postgres in
 * test/integration/outbox.test.ts. What matters here is the retry policy,
 * because getting it wrong is how a queue either gives up too early — losing
 * the message the outbox exists to protect — or never gives up at all and
 * churns forever without anyone noticing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeQuery } from '../helpers/db-mock';

const dbMock = vi.hoisted(() => ({ instance: null as unknown }));
vi.mock('@/lib/db', () => ({ get db() { return dbMock.instance; } }));

/** Capture inserts and updates so the policy can be asserted. */
function outboxMock(selectResult: unknown = []) {
  const inserted: Record<string, unknown>[] = [];
  const updated: Record<string, unknown>[] = [];
  const capture = (sink: Record<string, unknown>[], key: 'values' | 'set') => {
    const chain = makeQuery([{ id: 'row-1' }]);
    const orig = chain[key] as (v: unknown) => unknown;
    (chain as Record<string, unknown>)[key] = (v: unknown) => {
      sink.push(v as Record<string, unknown>);
      return orig(v);
    };
    return chain;
  };
  dbMock.instance = {
    insert: () => capture(inserted, 'values'),
    update: () => capture(updated, 'set'),
    select: () => makeQuery(selectResult),
    delete: () => makeQuery([{ id: 'd1' }, { id: 'd2' }]),
  };
  return { inserted, updated };
}

beforeEach(() => vi.resetModules());

describe('enqueue', () => {
  it('queues a message with its channel, kind and payload', async () => {
    const { inserted } = outboxMock();
    const { enqueue } = await import('@/lib/outbox');
    const ok = await enqueue(dbMock.instance as never, {
      channel: 'email',
      kind: 'payment-receipt',
      memberId: 'm1',
      payload: { subject: 'S', body: 'B' },
      dedupeKey: 'receipt-email:p1',
    });

    expect(ok).toBe(true);
    expect(inserted[0]).toMatchObject({
      channel: 'email',
      kind: 'payment-receipt',
      memberId: 'm1',
      dedupeKey: 'receipt-email:p1',
      maxAttempts: 5,
    });
  });

  it('reports false — not an error — when the dedupe key is already queued', async () => {
    // A replayed action has nothing to do. That is a success.
    const inserted: Record<string, unknown>[] = [];
    dbMock.instance = {
      insert: () => {
        const chain = makeQuery([]); // ON CONFLICT DO NOTHING returned no row
        const orig = chain.values as (v: unknown) => unknown;
        (chain as Record<string, unknown>).values = (v: unknown) => {
          inserted.push(v as Record<string, unknown>); return orig(v);
        };
        return chain;
      },
      select: () => makeQuery([]),
      update: () => makeQuery([]),
    };
    const { enqueue } = await import('@/lib/outbox');
    expect(await enqueue(dbMock.instance as never, {
      channel: 'push', kind: 'x', payload: {}, dedupeKey: 'dupe',
    })).toBe(false);
  });

  it('enqueueMany writes one row per member with a per-member dedupe key', async () => {
    const { inserted } = outboxMock();
    const { enqueueMany } = await import('@/lib/outbox');
    await enqueueMany(dbMock.instance as never, ['m1', 'm2', 'm3'], {
      channel: 'push',
      kind: 'case-opened',
      payload: { title: 'T', body: 'B' },
      dedupeKeyFor: (id) => `case-1:${id}`,
    });

    const rows = inserted[0] as unknown as Record<string, unknown>[];
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.dedupeKey)).toEqual(['case-1:m1', 'case-1:m2', 'case-1:m3']);
  });

  it('enqueueMany short-circuits on an empty recipient list', async () => {
    const { inserted } = outboxMock();
    const { enqueueMany } = await import('@/lib/outbox');
    expect(await enqueueMany(dbMock.instance as never, [], {
      channel: 'email', kind: 'x', payload: {},
    })).toBe(0);
    expect(inserted).toHaveLength(0);
  });
});

describe('markFailed — the retry policy', () => {
  it('backs off exponentially rather than hammering a failing provider', async () => {
    const { updated } = outboxMock();
    const { markFailed } = await import('@/lib/outbox');
    const before = Date.now();

    // attempts=0 -> 1st failure -> 1 minute
    expect(await markFailed({ id: 'x', attempts: 0, maxAttempts: 5 }, 'boom')).toBe('retry');
    const first = new Date(updated[0].nextAttemptAt as Date).getTime() - before;
    expect(first).toBeGreaterThanOrEqual(59_000);
    expect(first).toBeLessThan(70_000);

    // attempts=1 -> 2nd failure -> 5 minutes
    await markFailed({ id: 'x', attempts: 1, maxAttempts: 5 }, 'boom');
    const second = new Date(updated[1].nextAttemptAt as Date).getTime() - before;
    expect(second).toBeGreaterThan(first);
    expect(second).toBeGreaterThanOrEqual(4 * 60_000);
  });

  it('increments the attempt counter so the schedule advances', async () => {
    const { updated } = outboxMock();
    const { markFailed } = await import('@/lib/outbox');
    await markFailed({ id: 'x', attempts: 2, maxAttempts: 5 }, 'boom');
    expect(updated[0].attempts).toBe(3);
  });

  it('gives up into dead once attempts are exhausted — a queryable state, not a silent discard', async () => {
    const { updated } = outboxMock();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { markFailed } = await import('@/lib/outbox');

    expect(await markFailed({ id: 'x', attempts: 4, maxAttempts: 5 }, 'final boom')).toBe('dead');
    expect(updated[0]).toMatchObject({ state: 'dead', attempts: 5 });
    // No nextAttemptAt — a dead message is not scheduled again.
    expect(updated[0].nextAttemptAt).toBeUndefined();
  });

  it('logs at error level when a message dies, so it is discoverable', async () => {
    outboxMock();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { markFailed } = await import('@/lib/outbox');
    await markFailed({ id: 'msg-42', attempts: 4, maxAttempts: 5 }, 'provider rejected');
    expect(spy.mock.calls.flat().join(' ')).toMatch(/msg-42.*DEAD/);
  });

  it('truncates a huge provider error instead of storing it whole', async () => {
    const { updated } = outboxMock();
    const { markFailed } = await import('@/lib/outbox');
    await markFailed({ id: 'x', attempts: 0, maxAttempts: 5 }, 'e'.repeat(5000));
    expect(String(updated[0].lastError).length).toBeLessThanOrEqual(500);
  });

  it('respects a per-message maxAttempts override', async () => {
    const { updated } = outboxMock();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { markFailed } = await import('@/lib/outbox');
    // One attempt allowed: the first failure is terminal.
    expect(await markFailed({ id: 'x', attempts: 0, maxAttempts: 1 }, 'boom')).toBe('dead');
    expect(updated[0].state).toBe('dead');
  });
});

describe('markSent', () => {
  it('records the delivery time and clears the last error', async () => {
    const { updated } = outboxMock();
    const { markSent } = await import('@/lib/outbox');
    await markSent('x');
    expect(updated[0]).toMatchObject({ state: 'sent', lastError: null });
    expect(updated[0].sentAt).toBeInstanceOf(Date);
  });
});

describe('outboxHealth', () => {
  it('reports the counts and the age of the oldest pending message', async () => {
    outboxMock([{ pending: '3', sent: '120', dead: '2', oldest: '17.4' }]);
    const { outboxHealth } = await import('@/lib/outbox');
    expect(await outboxHealth()).toEqual({
      pending: 3, sent: 120, dead: 2, oldestPendingMinutes: 17,
    });
  });

  it('reports null age when nothing is pending, rather than zero', async () => {
    // Zero would read as "there is a message and it is brand new", which is
    // a different situation from "the queue is empty".
    outboxMock([{ pending: '0', sent: '5', dead: '0', oldest: null }]);
    const { outboxHealth } = await import('@/lib/outbox');
    expect((await outboxHealth()).oldestPendingMinutes).toBeNull();
  });
});

describe('pruneSent', () => {
  it('reports how many delivered messages it removed', async () => {
    outboxMock();
    const { pruneSent } = await import('@/lib/outbox');
    expect(await pruneSent(30)).toBe(2);
  });
});

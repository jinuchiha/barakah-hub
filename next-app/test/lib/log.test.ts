/**
 * Tests for lib/log.ts.
 *
 * The audit asked seven operational questions and only one had an answer.
 * The reason was the log format: ~40 bare `console.error('[push] ...')` calls
 * with no request id, no actor, no duration and no shape. Given "my payment
 * failed this morning" there was nothing to grep for.
 *
 * What is asserted here is the machine-readability, because that is the whole
 * point — a log line nobody can query is decoration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const headerMock = vi.hoisted(() => ({ id: null as string | null, throws: false }));

vi.mock('next/headers', () => ({
  headers: async () => {
    if (headerMock.throws) throw new Error('called outside a request scope');
    return new Headers(headerMock.id ? { 'x-request-id': headerMock.id } : {});
  },
}));

let logged: { level: string; line: Record<string, unknown> }[] = [];

beforeEach(() => {
  logged = [];
  headerMock.id = 'req-abc123';
  headerMock.throws = false;
  for (const level of ['log', 'warn', 'error'] as const) {
    vi.spyOn(console, level).mockImplementation((arg: unknown) => {
      logged.push({ level, line: JSON.parse(String(arg)) as Record<string, unknown> });
    });
  }
});
afterEach(() => vi.restoreAllMocks());

describe('every line is queryable JSON', () => {
  it('emits parseable JSON, not a formatted string', async () => {
    const { logger } = await import('@/lib/log');
    await logger.info({ event: 'payment.verified', actorId: 'a1', targetId: 'p1' });

    expect(logged).toHaveLength(1);
    expect(logged[0].line).toMatchObject({
      level: 'info',
      event: 'payment.verified',
      actorId: 'a1',
      targetId: 'p1',
      requestId: 'req-abc123',
    });
  });

  it('always carries the request id — the field that makes a trace findable', async () => {
    const { logger } = await import('@/lib/log');
    await logger.info({ event: 'a' });
    await logger.warn({ event: 'b' });
    await logger.error({ event: 'c' });
    expect(logged.map((l) => l.line.requestId)).toEqual(['req-abc123', 'req-abc123', 'req-abc123']);
  });

  it('carries an ISO timestamp', async () => {
    const { logger } = await import('@/lib/log');
    await logger.info({ event: 'x' });
    expect(String(logged[0].line.ts)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('routes error to console.error so the platform severity filter still works', async () => {
    const { logger } = await import('@/lib/log');
    await logger.error({ event: 'boom' });
    await logger.warn({ event: 'meh' });
    await logger.info({ event: 'fyi' });
    expect(logged.map((l) => l.level)).toEqual(['error', 'warn', 'log']);
  });

  it('marks an unstamped request rather than inventing an id', async () => {
    // A request that somehow bypassed middleware should be visible as such,
    // not disguised with a fresh id that correlates with nothing.
    headerMock.id = null;
    const { logger } = await import('@/lib/log');
    await logger.info({ event: 'x' });
    expect(logged[0].line.requestId).toBe('unstamped');
  });

  it('still logs outside a request scope, for scripts and crons', async () => {
    headerMock.throws = true;
    const { logger } = await import('@/lib/log');
    await logger.info({ event: 'cron.tick' });
    expect(logged[0].line.requestId).toBe('no-request-scope');
    expect(logged[0].line.event).toBe('cron.tick');
  });
});

describe('logError', () => {
  it('records the error name and message without the stack', async () => {
    // Stacks belong in Sentry, which has source maps. Duplicating them here
    // just makes the log expensive to read.
    const { logError } = await import('@/lib/log');
    await logError({ event: 'api.internal_error', route: '/api/x', err: new TypeError('bad thing') });

    expect(logged[0].line).toMatchObject({
      event: 'api.internal_error',
      route: '/api/x',
      errorName: 'TypeError',
      errorMessage: 'bad thing',
    });
    expect(logged[0].line).not.toHaveProperty('stack');
    expect(logged[0].line).not.toHaveProperty('err');
  });

  it('handles a non-Error throw without crashing the logger', async () => {
    const { logError } = await import('@/lib/log');
    await logError({ event: 'x', err: 'just a string' });
    expect(logged[0].line).toMatchObject({ errorName: 'string', errorMessage: 'just a string' });
  });
});

describe('timed', () => {
  it('records a duration and the ok outcome, and returns the value', async () => {
    const { timed } = await import('@/lib/log');
    const result = await timed('db.query', async () => 'value', { actorId: 'a1' });

    expect(result).toBe('value');
    expect(logged[0].line).toMatchObject({ event: 'db.query', outcome: 'ok', actorId: 'a1' });
    expect(typeof logged[0].line.durationMs).toBe('number');
  });

  it('records the failure and RE-THROWS, staying transparent to control flow', async () => {
    const { timed } = await import('@/lib/log');
    await expect(
      timed('db.query', async () => { throw new Error('deadlock'); }),
    ).rejects.toThrow('deadlock');

    expect(logged[0].level).toBe('error');
    expect(logged[0].line).toMatchObject({
      event: 'db.query', outcome: 'error', errorMessage: 'deadlock',
    });
    // The duration is what makes "is the database slow?" answerable, so it
    // must be present on the failure path too, not just the happy one.
    expect(typeof logged[0].line.durationMs).toBe('number');
  });
});

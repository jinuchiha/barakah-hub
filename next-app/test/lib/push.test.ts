/**
 * Regression tests for lib/push.ts (BH-07).
 *
 * Two defects, both of which made broken push delivery invisible:
 *
 *  · `res.ok` was never checked. When Expo answered with an error envelope,
 *    `json.data` was undefined, the receipt loop never ran, and the function
 *    returned `{ sent: messages.length, invalid: 0 }` — a full success report
 *    for a total failure. The one signal that could have revealed the problem
 *    was hard-coded to say everything was fine.
 *
 *  · Every token went in one request, but Expo rejects batches over 100, so
 *    any broadcast to a larger family failed wholesale.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const tokensMock = vi.hoisted(() => ({ rows: [] as { token: string }[] }));
const deletedMock = vi.hoisted(() => ({ calls: 0 }));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => tokensMock.rows }) }),
    delete: () => ({ where: async () => { deletedMock.calls++; } }),
  },
}));

function tokens(n: number) {
  tokensMock.rows = Array.from({ length: n }, (_, i) => ({ token: `ExponentPushToken[${i}]` }));
}

const payload = { title: 'T', body: 'B' };

beforeEach(() => {
  vi.resetModules();
  deletedMock.calls = 0;
  tokensMock.rows = [];
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('sendPushToMembers — honest reporting', () => {
  it('does NOT report success when Expo returns an error envelope', async () => {
    tokens(3);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS' }] }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    )));

    const { sendPushToMembers } = await import('@/lib/push');
    const res = await sendPushToMembers(['m1'], payload);

    expect(res.sent).toBe(0);
    expect(res.failed).toBe(3);
  });

  it('does NOT report success on a 200 with no receipt array', async () => {
    tokens(2);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )));

    const { sendPushToMembers } = await import('@/lib/push');
    const res = await sendPushToMembers(['m1'], payload);

    expect(res.sent).toBe(0);
    expect(res.failed).toBe(2);
  });

  it('counts a network failure as failed, not sent', async () => {
    tokens(4);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));

    const { sendPushToMembers } = await import('@/lib/push');
    const res = await sendPushToMembers(['m1'], payload);

    expect(res.sent).toBe(0);
    expect(res.failed).toBe(4);
  });

  it('reports real receipts accurately', async () => {
    tokens(3);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ data: [
        { status: 'ok' },
        { status: 'error', details: { error: 'MessageTooBig' } },
        { status: 'ok' },
      ] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )));

    const { sendPushToMembers } = await import('@/lib/push');
    const res = await sendPushToMembers(['m1'], payload);

    expect(res).toEqual({ sent: 2, invalid: 1, failed: 0 });
  });

  it('treats a short receipt array as unconfirmed rather than delivered', async () => {
    tokens(5);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ data: [{ status: 'ok' }, { status: 'ok' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )));

    const { sendPushToMembers } = await import('@/lib/push');
    const res = await sendPushToMembers(['m1'], payload);

    expect(res.sent).toBe(2);
    expect(res.failed).toBe(3);
  });
});

describe('sendPushToMembers — batching', () => {
  it('splits above Expo\'s 100-message limit instead of failing wholesale', async () => {
    tokens(250);
    const sizes: number[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as unknown[];
      sizes.push(body.length);
      return new Response(
        JSON.stringify({ data: body.map(() => ({ status: 'ok' })) }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }));

    const { sendPushToMembers } = await import('@/lib/push');
    const res = await sendPushToMembers(['m1'], payload);

    expect(sizes).toEqual([100, 100, 50]);
    expect(res.sent).toBe(250);
    expect(res.failed).toBe(0);
  });

  it('keeps going when one batch fails, and reports the partial result', async () => {
    tokens(150);
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as unknown[];
      call++;
      if (call === 1) return new Response('{"errors":[]}', { status: 500 });
      return new Response(
        JSON.stringify({ data: body.map(() => ({ status: 'ok' })) }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }));

    const { sendPushToMembers } = await import('@/lib/push');
    const res = await sendPushToMembers(['m1'], payload);

    expect(res.failed).toBe(100);
    expect(res.sent).toBe(50);
  });
});

describe('sendPushToMembers — token hygiene', () => {
  it('prunes tokens Expo reports as DeviceNotRegistered', async () => {
    tokens(2);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ data: [
        { status: 'ok' },
        { status: 'error', details: { error: 'DeviceNotRegistered' } },
      ] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )));

    const { sendPushToMembers } = await import('@/lib/push');
    await sendPushToMembers(['m1'], payload);

    expect(deletedMock.calls).toBe(1);
  });

  it('short-circuits with no members or no registered devices', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { sendPushToMembers } = await import('@/lib/push');

    expect(await sendPushToMembers([], payload)).toEqual({ sent: 0, invalid: 0, failed: 0 });
    tokens(0);
    expect(await sendPushToMembers(['m1'], payload)).toEqual({ sent: 0, invalid: 0, failed: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

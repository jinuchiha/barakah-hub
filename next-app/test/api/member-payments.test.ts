/**
 * GET /api/members/[id]/payments — the endpoint that makes the member
 * profile's donation record data-driven. Tests pin the two things that
 * matter: WHO may read a member's financial history, and that the totals
 * are computed from the authoritative `status` enum.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeDbMock, makeSessionMock } from '../helpers/db-mock';

const sessionMock = vi.hoisted(() => ({ instance: null as unknown }));
const dbMock = vi.hoisted(() => ({ instance: null as unknown }));

vi.mock('@/lib/auth-server', async () => {
  const { makeAuthServerMock } = await import('../helpers/auth-mock');
  return makeAuthServerMock(sessionMock, dbMock);
});
vi.mock('@/lib/db', async () => {
  const { makeDbModuleMock } = await import('../helpers/db-module-mock');
  return makeDbModuleMock(dbMock);
});

const TARGET = '00000000-0000-0000-0000-0000000000aa';

const base = { authId: 'auth-1', status: 'approved' as const, deceased: false, nameEn: 'X', nameUr: 'X' };
const owner = { ...base, id: TARGET, role: 'member' as const };
const stranger = { ...base, id: '00000000-0000-0000-0000-0000000000bb', authId: 'auth-2', role: 'member' as const };
const admin = { ...base, id: '00000000-0000-0000-0000-0000000000cc', authId: 'auth-3', role: 'admin' as const };
const supervisor = { ...base, id: '00000000-0000-0000-0000-0000000000dd', authId: 'auth-4', role: 'supervisor' as const };

const PAYMENTS = [
  { id: 'p1', memberId: TARGET, amount: 1000, pool: 'sadaqah', status: 'verified', paidOn: '2026-08-01' },
  { id: 'p2', memberId: TARGET, amount: 500, pool: 'zakat', status: 'verified', paidOn: '2026-07-01' },
  { id: 'p3', memberId: TARGET, amount: 700, pool: 'sadaqah', status: 'submitted', paidOn: '2026-09-01' },
  { id: 'p4', memberId: TARGET, amount: 300, pool: 'sadaqah', status: 'supervisor_approved', paidOn: '2026-09-02' },
  { id: 'p5', memberId: TARGET, amount: 900, pool: 'sadaqah', status: 'supervisor_rejected', paidOn: '2026-06-01' },
  { id: 'p6', memberId: TARGET, amount: 400, pool: 'zakat', status: 'voided', paidOn: '2026-05-01' },
];

function asUser(member: typeof owner, rows: unknown[] = PAYMENTS) {
  sessionMock.instance = makeSessionMock({ id: member.authId });
  dbMock.instance = makeDbMock({ selectQueue: [[member], rows] });
}

async function call(id = TARGET) {
  const { GET } = await import('@/app/api/members/[id]/payments/route');
  return GET({} as never, { params: Promise.resolve({ id }) });
}

beforeEach(() => vi.resetModules());

describe('member payments — authorization', () => {
  it('a member reads their OWN history', async () => {
    asUser(owner);
    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.payments).toHaveLength(6);
  });

  it('another member is FORBIDDEN — donations are financial data', async () => {
    asUser(stranger);
    const res = await call();
    expect(res.status).toBe(403);
  });

  it('admin and supervisor read any member (verification workflow)', async () => {
    asUser(admin);
    expect((await call()).status).toBe(200);
    asUser(supervisor);
    expect((await call()).status).toBe(200);
  });

  it('unauthenticated → 401', async () => {
    sessionMock.instance = null;
    dbMock.instance = makeDbMock({});
    expect((await call()).status).toBe(401);
  });

  it('malformed id → 400 before any query', async () => {
    asUser(admin);
    expect((await call('not-a-uuid')).status).toBe(400);
  });
});

describe('member payments — totals from the status enum', () => {
  it('verified counts only status=verified; pending counts submitted + supervisor_approved; rejected and voided count nowhere', async () => {
    asUser(admin);
    const body = await (await call()).json();
    expect(body.totals.verified).toBe(1500);         // p1 + p2
    expect(body.totals.verifiedCount).toBe(2);
    expect(body.totals.pending).toBe(1000);          // p3 + p4
    expect(body.totals.count).toBe(6);               // full history length
    expect(body.totals.byPool.sadaqah).toBe(1000);
    expect(body.totals.byPool.zakat).toBe(500);
  });

  it('empty history yields zeroed totals, not errors', async () => {
    asUser(admin, []);
    const body = await (await call()).json();
    expect(body.payments).toHaveLength(0);
    expect(body.totals.verified).toBe(0);
    expect(body.totals.lastPaidOn).toBeNull();
  });
});

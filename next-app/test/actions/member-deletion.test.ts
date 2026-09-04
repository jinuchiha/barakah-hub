/**
 * Regression tests for hardDeleteMember (BH-01).
 *
 * The original bug was not "delete sometimes fails" — it was that the delete
 * ALWAYS failed, after already mutating. The function cleared spouse pointers
 * and re-parented the member's children, and only then issued the DELETE,
 * which audit_log.actor_id (REFERENCES members(id), no ON DELETE) rejected.
 * Every member has an audit row from onboarding, so the FK violation was
 * certain — and with no transaction on the neon-http driver those two updates
 * stayed committed. The admin saw an error while the family tree had silently
 * been rewritten under them.
 *
 * The invariants pinned here:
 *   1. Nothing is mutated before the decision to delete is final.
 *   2. Financial and audit history block deletion outright.
 *   3. The audit entry is written BEFORE the row disappears, and carries the
 *      identity, because target_id is nulled by the FK afterwards.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeDbMock, makeSessionMock, makeQuery } from '../helpers/db-mock';

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
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/after-response', () => ({ runAfterResponse: vi.fn() }));
vi.mock('@/lib/push', () => ({
  broadcastPush: vi.fn().mockResolvedValue({ sent: 0, invalid: 0, failed: 0 }),
  sendPushToMembers: vi.fn().mockResolvedValue({ sent: 0, invalid: 0, failed: 0 }),
}));
vi.mock('@/lib/notify', () => ({
  notifyMembers: vi.fn(async () => {}), fundApproverIds: vi.fn(async () => []),
  adminIds: vi.fn(async () => []), emailFundApprovers: vi.fn(async () => {}),
  alertAdminsNewMember: vi.fn(async () => {}),
}));
vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: vi.fn(), sendApprovalEmail: vi.fn(), sendPaymentReceiptEmail: vi.fn(),
  sendEmergencyCaseEmail: vi.fn(), sendMonthlyStatementEmail: vi.fn(),
  sendPaymentReviewEmail: vi.fn(), sendOtpEmail: vi.fn(),
}));
vi.mock('@/lib/whatsapp', () => ({
  sendWhatsAppText: vi.fn().mockResolvedValue(true),
  sendWhatsAppTemplate: vi.fn().mockResolvedValue(true),
  sendWhatsAppBusinessMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

const TARGET = '00000000-0000-0000-0000-0000000000aa';
const admin = {
  id: 'admin-1', authId: 'auth-admin', role: 'admin' as const,
  status: 'approved' as const, deceased: false, nameEn: 'Admin', nameUr: 'ایڈمن',
};
const target = {
  id: TARGET, role: 'member' as const, status: 'approved' as const,
  deceased: false, username: 'ghost', nameEn: 'Ghost', nameUr: 'گھوسٹ',
};

/** Order matches the Promise.all in hardDeleteMember. */
type Refs = [payments: number, cases: number, loans: number, votes: number, audits: number, children: number];
const NO_REFS: Refs = [0, 0, 0, 0, 0, 0];

/** Build a db mock that also records update/delete/insert traffic. */
function trackedDb(refs: Refs) {
  const db = makeDbMock({ selectQueue: [[admin], [target]], countQueue: refs });
  const log: string[] = [];
  const inserted: unknown[] = [];

  const origUpdate = db.update;
  db.update = ((...a: unknown[]) => { log.push('update'); return origUpdate(...(a as [])); }) as typeof db.update;
  const origDelete = db.delete;
  db.delete = ((...a: unknown[]) => { log.push('delete'); return origDelete(...(a as [])); }) as typeof db.delete;
  db.insert = ((...a: unknown[]) => {
    log.push('insert');
    const chain = makeQuery([{ id: 'x' }]);
    const origValues = chain.values as (v: unknown) => unknown;
    (chain as Record<string, unknown>).values = (v: unknown) => { inserted.push(v); return origValues(v); };
    return chain;
  }) as unknown as typeof db.insert;

  return { db, log, inserted };
}

beforeEach(() => {
  vi.resetModules();
  sessionMock.instance = makeSessionMock({ id: 'auth-admin' });
});

describe('hardDeleteMember — refuses before it mutates', () => {
  it.each([
    ['payment records', [3, 0, 0, 0, 0, 0] as Refs, /payment records/i],
    ['emergency cases', [0, 1, 0, 0, 0, 0] as Refs, /emergency cases/i],
    ['loans', [0, 0, 1, 0, 0, 0] as Refs, /loans/i],
    ['votes', [0, 0, 0, 2, 0, 0] as Refs, /votes/i],
    ['audit actions they performed', [0, 0, 0, 0, 5, 0] as Refs, /audit-log actions/i],
    ['children in the tree', [0, 0, 0, 0, 0, 1] as Refs, /children/i],
  ])('refuses a member with %s, and writes nothing', async (_label, refs, expected) => {
    const { db, log } = trackedDb(refs);
    dbMock.instance = db;

    const { hardDeleteMember } = await import('@/app/actions');
    await expect(hardDeleteMember(TARGET)).rejects.toThrow(expected);

    // The regression that mattered: no partial mutation on the refusal path.
    expect(log).toEqual([]);
  });

  it('names the member and points at the safe alternative', async () => {
    const { db } = trackedDb([1, 0, 0, 0, 0, 0]);
    dbMock.instance = db;
    const { hardDeleteMember } = await import('@/app/actions');
    // One call only — the mock's select queue is consumed per invocation.
    const err = await hardDeleteMember(TARGET).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/Ghost/);
    expect((err as Error).message).toMatch(/payment records/i);
    expect((err as Error).message).toMatch(/deceased/i);
  });
});

describe('hardDeleteMember — the permitted path', () => {
  it('deletes a member with no footprint using a single statement', async () => {
    const { db, log } = trackedDb(NO_REFS);
    dbMock.instance = db;

    const { hardDeleteMember } = await import('@/app/actions');
    await expect(hardDeleteMember(TARGET)).resolves.toBeUndefined();

    // Exactly one audit insert then one delete. No pre-emptive UPDATEs:
    // members.parent_id and members.spouse_id are ON DELETE SET NULL, so the
    // database handles both atomically and the old manual updates were both
    // redundant and the cause of the corruption.
    expect(log).toEqual(['insert', 'delete']);
    expect(log).not.toContain('update');
  });

  it('audits BEFORE the delete and records the identity in the detail', async () => {
    const { db, inserted, log } = trackedDb(NO_REFS);
    dbMock.instance = db;

    const { hardDeleteMember } = await import('@/app/actions');
    await hardDeleteMember(TARGET);

    expect(log.indexOf('insert')).toBeLessThan(log.indexOf('delete'));

    const entry = inserted[0] as { action: string; detail: string; targetId?: string };
    expect(entry.action).toBe('member-deleted');
    // target_id is SET NULL by the FK once the member is gone, so the trail
    // is only readable if the identity lives in the text.
    expect(entry.detail).toContain(TARGET);
    expect(entry.detail).toContain('ghost');
    expect(entry.targetId).toBeUndefined();
  });

  it('still refuses to delete the last admin', async () => {
    const db = makeDbMock({
      selectQueue: [[admin], [{ ...target, role: 'admin' }]],
      countResult: 1, // only one living admin → refuse before anything else
    });
    dbMock.instance = db;
    const { hardDeleteMember } = await import('@/app/actions');
    await expect(hardDeleteMember(TARGET)).rejects.toThrow(/last admin/i);
  });

  it('still refuses self-deletion', async () => {
    dbMock.instance = makeDbMock({ selectQueue: [[admin]] });
    const { hardDeleteMember } = await import('@/app/actions');
    await expect(hardDeleteMember('admin-1')).rejects.toThrow(/yourself/i);
  });

  it('still refuses a non-admin caller', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-1' });
    dbMock.instance = makeDbMock({ selectQueue: [[{ ...admin, id: 'm2', role: 'member' }]] });
    const { hardDeleteMember } = await import('@/app/actions');
    await expect(hardDeleteMember(TARGET)).rejects.toThrow(/admin only/i);
  });
});

/**
 * softDeleteMember shares the lockout risk: requireRole refuses a deceased
 * caller, so marking the only admin deceased revokes the last set of
 * credentials that could undo it.
 */
describe('softDeleteMember — last-admin guard', () => {
  it('refuses to mark the last admin deceased', async () => {
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ role: 'admin' }]],
      countResult: 0,
    });
    const { softDeleteMember } = await import('@/app/actions');
    await expect(softDeleteMember(TARGET)).rejects.toThrow(/last admin/i);
  });

  it('allows it while another admin remains', async () => {
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ role: 'admin' }]],
      countResult: 2,
    });
    const { softDeleteMember } = await import('@/app/actions');
    await expect(softDeleteMember(TARGET)).resolves.toBeUndefined();
  });

  it('does not run the guard for a non-admin member', async () => {
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ role: 'member' }]],
      countResult: 0,
    });
    const { softDeleteMember } = await import('@/app/actions');
    await expect(softDeleteMember(TARGET)).resolves.toBeUndefined();
  });
});

/**
 * Authorization tests for server actions in app/actions.ts.
 * Confirms role/status gates fire before any side-effect.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeDbMock, makeSessionMock } from '../helpers/db-mock';

const sessionMock = vi.hoisted(() => ({ instance: null as unknown }));
const dbMock = vi.hoisted(() => ({ instance: null as unknown }));

vi.mock('@/lib/auth-server', () => ({
  getSession: async () => sessionMock.instance,
  getUser: async () => (sessionMock.instance as any)?.user ?? null,
  getMeOrRedirect: async () => { throw new Error('not used in action tests'); },
}));
vi.mock('@/lib/db', () => ({
  get db() { return dbMock.instance; },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const memberRow = {
  id: 'member-1',
  authId: 'auth-1',
  role: 'member' as const,
  status: 'approved' as const,
  deceased: false,
  nameEn: 'Test',
  nameUr: 'تست',
};
const adminRow = {
  ...memberRow,
  id: '11111111-1111-1111-1111-111111111111',
  authId: 'auth-admin',
  role: 'admin' as const,
};

describe('approveMember', () => {
  beforeEach(() => vi.resetModules());

  it('rejects when caller is not admin', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-1' });
    dbMock.instance = makeDbMock({ selectQueue: [[memberRow]] });
    const { approveMember } = await import('@/app/actions');

    await expect(approveMember('00000000-0000-0000-0000-000000000001'))
      .rejects.toThrow(/admin only/i);
  });

  it('rejects malformed UUID input', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-admin' });
    dbMock.instance = makeDbMock({ selectQueue: [[adminRow]] });
    const { approveMember } = await import('@/app/actions');

    await expect(approveMember('not-a-uuid')).rejects.toThrow(/invalid id/i);
  });

  it('rejects when caller has no member record', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-orphan' });
    dbMock.instance = makeDbMock({ selectQueue: [[]] });
    const { approveMember } = await import('@/app/actions');

    await expect(approveMember('00000000-0000-0000-0000-000000000001'))
      .rejects.toThrow(/member record not found/i);
  });
});

describe('castVote', () => {
  beforeEach(() => vi.resetModules());

  it('rejects when not authenticated', async () => {
    sessionMock.instance = makeSessionMock(null);
    dbMock.instance = makeDbMock({});
    const { castVote } = await import('@/app/actions');

    await expect(castVote('00000000-0000-0000-0000-000000000001', true))
      .rejects.toThrow(/not authenticated/i);
  });

  it('rejects when status is not approved', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-1' });
    dbMock.instance = makeDbMock({
      selectQueue: [[{ ...memberRow, status: 'pending' as const }]],
    });
    const { castVote } = await import('@/app/actions');

    await expect(castVote('00000000-0000-0000-0000-000000000001', true))
      .rejects.toThrow(/not approved/i);
  });

  it('rejects when caller is deceased', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-1' });
    dbMock.instance = makeDbMock({
      selectQueue: [[{ ...memberRow, deceased: true }]],
    });
    const { castVote } = await import('@/app/actions');

    await expect(castVote('00000000-0000-0000-0000-000000000001', true))
      .rejects.toThrow(/not eligible/i);
  });

  it('rejects voting on own case', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-1' });
    dbMock.instance = makeDbMock({
      selectQueue: [
        [memberRow], // meOrThrow
        [{ id: 'case-1', applicantId: memberRow.id, status: 'voting' }], // case lookup — same applicant
      ],
    });
    const { castVote } = await import('@/app/actions');

    await expect(castVote('00000000-0000-0000-0000-000000000001', true))
      .rejects.toThrow(/cannot vote on your own/i);
  });

  it('rejects when voting is closed', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-1' });
    dbMock.instance = makeDbMock({
      selectQueue: [
        [memberRow],
        [{ id: 'case-1', applicantId: 'member-2', status: 'approved' }],
      ],
    });
    const { castVote } = await import('@/app/actions');

    await expect(castVote('00000000-0000-0000-0000-000000000001', true))
      .rejects.toThrow(/voting closed/i);
  });

  it('rejects malformed UUID', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-1' });
    dbMock.instance = makeDbMock({});
    const { castVote } = await import('@/app/actions');

    await expect(castVote('not-a-uuid', true)).rejects.toThrow(/invalid case id/i);
  });
});

describe('recordRepayment', () => {
  beforeEach(() => vi.resetModules());

  it('rejects non-admin caller', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-1' });
    dbMock.instance = makeDbMock({ selectQueue: [[memberRow]] });
    const { recordRepayment } = await import('@/app/actions');

    await expect(
      recordRepayment({
        loanId: '00000000-0000-0000-0000-000000000001',
        amount: 100,
      }),
    ).rejects.toThrow(/admin only/i);
  });

  it('rejects amount exceeding remaining balance', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-admin' });
    dbMock.instance = makeDbMock({
      selectQueue: [
        [adminRow],
        [{ id: 'loan-1', amount: 1000, paid: 800, active: true, memberId: 'member-1' }],
      ],
    });
    const { recordRepayment } = await import('@/app/actions');

    await expect(
      recordRepayment({
        loanId: '00000000-0000-0000-0000-000000000001',
        amount: 500, // remaining is only 200
      }),
    ).rejects.toThrow(/exceeds remaining/i);
  });

  it('rejects repayment on settled loan', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-admin' });
    dbMock.instance = makeDbMock({
      selectQueue: [
        [adminRow],
        [{ id: 'loan-1', amount: 1000, paid: 1000, active: false, memberId: 'member-1' }],
      ],
    });
    const { recordRepayment } = await import('@/app/actions');

    await expect(
      recordRepayment({
        loanId: '00000000-0000-0000-0000-000000000001',
        amount: 100,
      }),
    ).rejects.toThrow(/already settled/i);
  });
});

describe('editMember', () => {
  beforeEach(() => vi.resetModules());

  it('rejects self-demotion', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-admin' });
    dbMock.instance = makeDbMock({ selectQueue: [[adminRow]] });
    const { editMember } = await import('@/app/actions');

    await expect(
      editMember({
        id: adminRow.id,
        role: 'member',
      }),
    ).rejects.toThrow(/cannot demote yourself/i);
  });
});

/**
 * Security tests for the P0-1 fix (now under Better-Auth).
 * Verifies that `onboardSelf` derives identity from session, never the body.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeDbMock, makeSessionMock } from '../helpers/db-mock';

const sessionMock = vi.hoisted(() => ({ instance: null as unknown }));
const dbMock = vi.hoisted(() => ({ instance: null as unknown }));

vi.mock('@/lib/auth-server', () => ({
  getSession: async () => sessionMock.instance,
  getUser: async () => (sessionMock.instance as any)?.user ?? null,
  getMeOrRedirect: async () => { throw new Error('not used in onboarding tests'); },
}));

vi.mock('@/lib/db', () => ({
  get db() { return dbMock.instance; },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Email helpers no-op during unit tests — we don't want Resend SDK loading
// or pretending to send during isolated action tests.
vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendApprovalEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentReceiptEmail: vi.fn().mockResolvedValue(undefined),
  sendEmergencyCaseEmail: vi.fn().mockResolvedValue(undefined),
  sendMonthlyStatementEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('onboardSelf', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects when user is not authenticated', async () => {
    sessionMock.instance = makeSessionMock(null);
    dbMock.instance = makeDbMock({});
    const { onboardSelf } = await import('@/app/onboarding/actions');

    await expect(
      onboardSelf({
        nameEn: 'Test',
        fatherName: 'Test Father',
        phone: '0300-1234567',
        city: 'Karachi',
        province: 'sindh',
      }),
    ).rejects.toThrow(/not authenticated/i);
  });

  it('rejects when account already onboarded', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-uuid-123', email: 'me@x.com' });
    dbMock.instance = makeDbMock({
      // First select returns the existing member, so onboardSelf bails.
      selectQueue: [
        [{ id: 'member-1', authId: 'auth-uuid-123', role: 'member' }],
      ],
    });
    const { onboardSelf } = await import('@/app/onboarding/actions');

    await expect(
      onboardSelf({
        nameEn: 'Test',
        fatherName: 'Test Father',
        phone: '0300-1234567',
        city: 'Karachi',
        province: 'sindh',
      }),
    ).rejects.toThrow(/already onboarded/i);
  });

  it('rejects self-claim of an admin record (P0-1 regression test)', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-uuid-123', email: 'evil@x.com' });
    dbMock.instance = makeDbMock({
      selectQueue: [
        // 1st: select by authId — no rows (not yet onboarded)
        [],
        // 2nd: select by username — finds an unclaimed admin record
        [{ id: 'admin-1', authId: null, role: 'admin', status: 'approved', username: 'evil' }],
      ],
    });
    const { onboardSelf } = await import('@/app/onboarding/actions');

    await expect(
      onboardSelf({
        nameEn: 'Evil',
        fatherName: 'Evil Father',
        phone: '0300-1234567',
        city: 'Karachi',
        province: 'sindh',
      }),
    ).rejects.toThrow(/admin records cannot be self-claimed/i);
  });

  it('rejects invalid input (Zod validation)', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-uuid-123', email: 'a@b.com' });
    dbMock.instance = makeDbMock({ selectQueue: [[], []] });
    const { onboardSelf } = await import('@/app/onboarding/actions');

    // nameEn too short
    await expect(
      onboardSelf({
        nameEn: 'A',
        fatherName: 'Test Father',
        phone: '0300-1234567',
        city: 'Karachi',
        province: 'sindh',
      }),
    ).rejects.toThrow();
  });
});

/**
 * Regression tests for payment idempotency (BH-03).
 *
 * The failure this prevents: a submission commits server-side but the client
 * times out (15s axios timeout on mobile, plus a cold start). The user's only
 * recovery is to submit again, and without a key that second attempt created
 * a second payment row. Once both were verified the fund total was credited
 * twice for money received once — a wrong ledger in the app whose entire
 * purpose is a correct one.
 *
 * The replay must return the ORIGINAL payment and must not re-fire the audit
 * row, the approver notifications or the emails.
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
vi.mock('@/lib/whatsapp', () => ({
  sendWhatsAppText: vi.fn().mockResolvedValue(true),
  sendWhatsAppTemplate: vi.fn().mockResolvedValue(true),
  sendWhatsAppBusinessMessage: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendApprovalEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentReceiptEmail: vi.fn().mockResolvedValue(undefined),
  sendEmergencyCaseEmail: vi.fn().mockResolvedValue(undefined),
  sendMonthlyStatementEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentReviewEmail: vi.fn().mockResolvedValue(undefined),
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

const notifyMock = vi.hoisted(() => ({ calls: 0 }));
vi.mock('@/lib/notify', () => ({
  notifyMembers: vi.fn(async () => { notifyMock.calls++; }),
  fundApproverIds: vi.fn(async () => []),
  adminIds: vi.fn(async () => []),
  emailFundApprovers: vi.fn(async () => {}),
  alertAdminsNewMember: vi.fn(async () => {}),
}));

const member = {
  id: 'member-1', authId: 'auth-1', role: 'member' as const,
  status: 'approved' as const, deceased: false, nameEn: 'Test', nameUr: 'تست',
};

const KEY = 'idem-key-0123456789';
const EXISTING = { id: 'pay-original', memberId: 'member-1', amount: 500, pool: 'sadaqah', monthLabel: 'May 2026' };

const input = { amount: 500, pool: 'sadaqah' as const, monthLabel: 'May 2026', idempotencyKey: KEY };

beforeEach(() => {
  vi.resetModules();
  notifyMock.calls = 0;
  sessionMock.instance = makeSessionMock({ id: 'auth-1' });
});

describe('submitDonation — idempotency', () => {
  it('returns the ORIGINAL payment when the key was already used, without inserting again', async () => {
    const db = makeDbMock({
      // 1st select → the caller's member row; 2nd → the prior payment.
      selectQueue: [[member], [EXISTING]],
    });
    const insertSpy = vi.fn(() => makeQuery([{ id: 'pay-DUPLICATE' }]));
    db.insert = insertSpy as unknown as typeof db.insert;
    dbMock.instance = db;

    const { submitDonation } = await import('@/app/actions');
    const result = await submitDonation(input);

    expect(result).toMatchObject({ id: 'pay-original' });
    // The whole point: nothing was written on the replay.
    expect(insertSpy).not.toHaveBeenCalled();
    expect(notifyMock.calls).toBe(0);
  });

  it('inserts and notifies exactly once on the first attempt', async () => {
    const db = makeDbMock({
      selectQueue: [[member], []], // no prior row for this key
      insertResult: [{ ...EXISTING, id: 'pay-new' }],
    });
    dbMock.instance = db;

    const { submitDonation } = await import('@/app/actions');
    const result = await submitDonation(input);

    expect(result).toMatchObject({ id: 'pay-new' });
    expect(notifyMock.calls).toBe(1);
  });

  it('resolves to the winner when a concurrent attempt with the same key wins the race', async () => {
    // Insert returns [] because ON CONFLICT DO NOTHING fired — another
    // in-flight request with the same key inserted first.
    const db = makeDbMock({
      selectQueue: [[member], [], [EXISTING]],
      insertResult: [],
    });
    dbMock.instance = db;

    const { submitDonation } = await import('@/app/actions');
    const result = await submitDonation(input);

    expect(result).toMatchObject({ id: 'pay-original' });
    expect(notifyMock.calls).toBe(0);
  });

  it('surfaces an error rather than silently dropping money on an unexplained conflict', async () => {
    // ON CONFLICT fired but no row carries the key → the conflict came from
    // some other constraint. Failing loudly beats returning a fake success.
    const db = makeDbMock({
      selectQueue: [[member], [], []],
      insertResult: [],
    });
    dbMock.instance = db;

    const { submitDonation } = await import('@/app/actions');
    await expect(submitDonation(input)).rejects.toThrow(/could not be recorded/i);
  });

  it('still works without a key (backwards compatible), inserting normally', async () => {
    const db = makeDbMock({
      selectQueue: [[member]],
      insertResult: [{ ...EXISTING, id: 'pay-nokey' }],
    });
    dbMock.instance = db;

    const { submitDonation } = await import('@/app/actions');
    const result = await submitDonation({ amount: 500, pool: 'sadaqah', monthLabel: 'May 2026' });
    expect(result).toMatchObject({ id: 'pay-nokey' });
    expect(notifyMock.calls).toBe(1);
  });

  it('rejects a key that is too short to be a real token', async () => {
    dbMock.instance = makeDbMock({ selectQueue: [[member]] });
    const { submitDonation } = await import('@/app/actions');
    await expect(submitDonation({ ...input, idempotencyKey: 'short' })).rejects.toThrow();
  });
});

describe('recordPayment — idempotency on the admin path', () => {
  const admin = { ...member, id: 'admin-1', authId: 'auth-admin', role: 'admin' as const };
  const MEMBER_UUID = '00000000-0000-0000-0000-0000000000bb';

  const rpInput = {
    memberId: MEMBER_UUID, amount: 500, pool: 'sadaqah' as const,
    monthLabel: 'May 2026', idempotencyKey: KEY,
  };

  beforeEach(() => { sessionMock.instance = makeSessionMock({ id: 'auth-admin' }); });

  it('returns the original payment on a replay without inserting again', async () => {
    const db = makeDbMock({ selectQueue: [[admin], [EXISTING]] });
    const insertSpy = vi.fn(() => makeQuery([{ id: 'pay-DUPLICATE' }]));
    db.insert = insertSpy as unknown as typeof db.insert;
    dbMock.instance = db;

    const { recordPayment } = await import('@/app/actions');
    const result = await recordPayment(rpInput);

    expect(result).toMatchObject({ id: 'pay-original' });
    expect(insertSpy).not.toHaveBeenCalled();
    expect(notifyMock.calls).toBe(0);
  });

  it('inserts and notifies once on the first attempt', async () => {
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], []],
      insertResult: [{ ...EXISTING, id: 'pay-admin-new' }],
    });
    const { recordPayment } = await import('@/app/actions');
    const result = await recordPayment(rpInput);
    expect(result).toMatchObject({ id: 'pay-admin-new' });
    expect(notifyMock.calls).toBe(1);
  });

  it('still refuses a plain member', async () => {
    sessionMock.instance = makeSessionMock({ id: 'auth-1' });
    dbMock.instance = makeDbMock({ selectQueue: [[member]] });
    const { recordPayment } = await import('@/app/actions');
    await expect(recordPayment(rpInput)).rejects.toThrow(/admin or supervisor/i);
  });
});

/**
 * Money-path guards — the protections that keep the family's rupees
 * safe. Every test here is a tripwire: if a future change weakens one
 * of these guards, CI goes red before the change can reach production.
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
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/push', () => ({
  broadcastPush: vi.fn().mockResolvedValue({ sent: 0, invalid: 0 }),
  sendPushToMembers: vi.fn().mockResolvedValue({ sent: 0, invalid: 0 }),
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
vi.mock('@/lib/whatsapp', () => ({
  sendWhatsAppText: vi.fn().mockResolvedValue(true),
  sendWhatsAppTemplate: vi.fn().mockResolvedValue(true),
  buildPaymentReminder: vi.fn(() => 'msg'),
  buildApprovalNotice: vi.fn(() => 'msg'),
  waUrl: vi.fn(() => null),
}));

const UUID = '00000000-0000-0000-0000-000000000001';
const UUID2 = '00000000-0000-0000-0000-000000000002';

const member = { id: 'member-1', authId: 'auth-1', role: 'member' as const, status: 'approved' as const, deceased: false, nameEn: 'Test', nameUr: 'تست' };
const admin = { ...member, id: 'admin-1', authId: 'auth-admin', role: 'admin' as const };
const asAdmin = () => { sessionMock.instance = makeSessionMock({ id: 'auth-admin' }); };
const asMember = () => { sessionMock.instance = makeSessionMock({ id: 'auth-1' }); };

beforeEach(() => vi.resetModules());

describe('recordRepayment — overpay & settle guards', () => {
  it('rejects a repayment that exceeds the remaining balance', async () => {
    asAdmin();
    // conditional UPDATE loses (returns []) → loan re-read shows why
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ id: UUID, amount: 1000, paid: 800, active: true }]],
      updateResult: [],
    });
    const { recordRepayment } = await import('@/app/actions');
    await expect(recordRepayment({ loanId: UUID, amount: 300 }))
      .rejects.toThrow(/exceeds remaining 200/i);
  });

  it('rejects repayment on an already-settled loan', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ id: UUID, amount: 1000, paid: 1000, active: false }]],
      updateResult: [],
    });
    const { recordRepayment } = await import('@/app/actions');
    await expect(recordRepayment({ loanId: UUID, amount: 100 }))
      .rejects.toThrow(/already settled/i);
  });

  it('rejects non-admin callers before touching the ledger', async () => {
    asMember();
    dbMock.instance = makeDbMock({ selectQueue: [[member]] });
    const { recordRepayment } = await import('@/app/actions');
    await expect(recordRepayment({ loanId: UUID, amount: 100 }))
      .rejects.toThrow(/admin only/i);
  });

  it('rejects zero and negative amounts at the schema gate', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({ selectQueue: [[admin]] });
    const { recordRepayment } = await import('@/app/actions');
    await expect(recordRepayment({ loanId: UUID, amount: 0 })).rejects.toThrow();
    await expect(recordRepayment({ loanId: UUID, amount: -50 })).rejects.toThrow();
  });
});

describe('disburseCase — double-disbursement guard', () => {
  it('refuses when the status-conditioned UPDATE loses (already disbursed)', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ id: UUID, status: 'disbursed' }]],
      updateResult: [],
    });
    const { disburseCase } = await import('@/app/actions');
    await expect(disburseCase(UUID)).rejects.toThrow(/cannot disburse/i);
  });

  it('refuses non-admin callers', async () => {
    asMember();
    dbMock.instance = makeDbMock({ selectQueue: [[member]] });
    const { disburseCase } = await import('@/app/actions');
    await expect(disburseCase(UUID)).rejects.toThrow(/admin only/i);
  });
});

describe('castVote — vote integrity', () => {
  it('pending accounts cannot vote', async () => {
    asMember();
    dbMock.instance = makeDbMock({ selectQueue: [[{ ...member, status: 'pending' }]] });
    const { castVote } = await import('@/app/actions');
    await expect(castVote(UUID, true)).rejects.toThrow(/not approved/i);
  });

  it('voting is closed once the case leaves the voting state', async () => {
    asMember();
    dbMock.instance = makeDbMock({
      selectQueue: [[member], [{ id: UUID, status: 'approved', applicantId: UUID2 }]],
    });
    const { castVote } = await import('@/app/actions');
    await expect(castVote(UUID, true)).rejects.toThrow(/voting closed/i);
  });

  it('members cannot vote on their own request', async () => {
    asMember();
    dbMock.instance = makeDbMock({
      selectQueue: [[member], [{ id: UUID, status: 'voting', applicantId: 'member-1' }]],
    });
    const { castVote } = await import('@/app/actions');
    await expect(castVote(UUID, true)).rejects.toThrow(/own request/i);
  });
});

describe('verifyPayment — two-person rule', () => {
  it('admin cannot verify before the supervisor pre-approves', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ id: UUID, pendingVerify: true, supervisorApprovedAt: null, supervisorRejectedAt: null }]],
    });
    const { verifyPayment } = await import('@/app/actions');
    await expect(verifyPayment(UUID)).rejects.toThrow(/supervisor must approve/i);
  });

  it('a payment cannot be verified twice', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ id: UUID, pendingVerify: false }]],
    });
    const { verifyPayment } = await import('@/app/actions');
    await expect(verifyPayment(UUID)).rejects.toThrow(/already verified/i);
  });

  it('supervisor-rejected payments must be resent, not verified', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ id: UUID, pendingVerify: true, supervisorApprovedAt: new Date(), supervisorRejectedAt: new Date() }]],
    });
    const { verifyPayment } = await import('@/app/actions');
    await expect(verifyPayment(UUID)).rejects.toThrow(/rejected/i);
  });

  it('the supervisor approver cannot also be the verifier (same-actor bypass)', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{
        id: UUID, pendingVerify: true,
        supervisorApprovedAt: new Date(), supervisorRejectedAt: null,
        supervisorApprovedById: 'admin-1',
      }]],
      // Two eligible approvers exist, so two-person control is achievable
      // and must be enforced.
      countResult: 2,
    });
    const { verifyPayment } = await import('@/app/actions');
    await expect(verifyPayment(UUID)).rejects.toThrow(/two-person/i);
  });

  // Regression: BH-05. Enforcing the two-person rule unconditionally
  // deadlocked every single-admin install — the founder could supervisor-
  // approve but never verify, so no payment could ever reach the fund total
  // and the product's core loop was dead on arrival. The rule now degrades
  // when a second approver does not exist, and the degradation is recorded.
  it('allows self-verification when no second approver exists, and records it', async () => {
    asAdmin();
    const inserted: unknown[] = [];
    const db = makeDbMock({
      selectQueue: [
        [admin],
        [{ id: UUID, pendingVerify: true, supervisorApprovedAt: new Date(), supervisorRejectedAt: null, supervisorApprovedById: 'admin-1' }],
        [{ id: UUID, memberId: 'member-1', amount: 500, pool: 'sadaqah', monthLabel: 'May 2026' }],
      ],
      updateResult: [{ id: UUID }],
      countResult: 1, // the founder is the ONLY eligible approver
    });
    const origInsert = db.insert;
    db.insert = ((...args: unknown[]) => {
      const chain = origInsert(...(args as []));
      const origValues = chain.values as (v: unknown) => unknown;
      chain.values = (v: unknown) => { inserted.push(v); return origValues(v); };
      return chain;
    }) as typeof db.insert;
    dbMock.instance = db;

    const { verifyPayment } = await import('@/app/actions');
    await expect(verifyPayment(UUID)).resolves.toBeUndefined();

    const actions = inserted.map((v) => (v as { action?: string }).action).filter(Boolean);
    expect(actions).toContain('payment-verified-single-control');
    expect(actions).not.toContain('payment-verified');
  });

  it('still refuses self-verification when a second approver exists', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{
        id: UUID, pendingVerify: true,
        supervisorApprovedAt: new Date(), supervisorRejectedAt: null,
        supervisorApprovedById: 'admin-1',
      }]],
      countResult: 3,
    });
    const { verifyPayment } = await import('@/app/actions');
    await expect(verifyPayment(UUID)).rejects.toThrow(/two-person/i);
  });

  it('a concurrent verify that loses the conditional UPDATE throws instead of double-sending receipts', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{
        id: UUID, pendingVerify: true,
        supervisorApprovedAt: new Date(), supervisorRejectedAt: null,
        supervisorApprovedById: 'someone-else',
      }]],
      updateResult: [],
    });
    const { verifyPayment } = await import('@/app/actions');
    await expect(verifyPayment(UUID)).rejects.toThrow(/already verified/i);
  });
});

describe('adminResolveCase — veto race guard', () => {
  it('refuses when the case left voting before the UPDATE landed', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ id: UUID, status: 'approved' }]],
      updateResult: [],
    });
    const { adminResolveCase } = await import('@/app/actions');
    await expect(adminResolveCase(UUID, 'rejected')).rejects.toThrow(/already approved/i);
  });

  it('refuses non-admin callers', async () => {
    asMember();
    dbMock.instance = makeDbMock({ selectQueue: [[member]] });
    const { adminResolveCase } = await import('@/app/actions');
    await expect(adminResolveCase(UUID, 'approved')).rejects.toThrow(/admin only/i);
  });
});

describe('issueLoan — borrower eligibility', () => {
  it('cannot issue to a deceased member', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ ...member, deceased: true }]],
    });
    const { issueLoan } = await import('@/app/actions');
    await expect(issueLoan({ memberId: UUID, amount: 1000, purpose: 'test' }))
      .rejects.toThrow(/deceased/i);
  });

  it('cannot issue to an unapproved member', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ ...member, status: 'pending' }]],
    });
    const { issueLoan } = await import('@/app/actions');
    await expect(issueLoan({ memberId: UUID, amount: 1000, purpose: 'test' }))
      .rejects.toThrow(/approved/i);
  });
});

describe('openFautiCase — death-benefit guards', () => {
  it('only for deceased members', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ ...member, deceased: false }]],
    });
    const { openFautiCase } = await import('@/app/actions');
    await expect(openFautiCase(UUID)).rejects.toThrow(/deceased/i);
  });

  it('refuses when the fauti amount is unset', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ ...member, deceased: true }], [{ fautiAmount: 0 }]],
    });
    const { openFautiCase } = await import('@/app/actions');
    await expect(openFautiCase(UUID)).rejects.toThrow(/fauti amount/i);
  });

  it('one fauti case per member, ever', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({
      selectQueue: [[admin], [{ ...member, deceased: true }], [{ fautiAmount: 50000 }], [{ id: UUID2 }]],
    });
    const { openFautiCase } = await import('@/app/actions');
    await expect(openFautiCase(UUID)).rejects.toThrow(/already exists/i);
  });
});

describe('submitDonation — donor gate', () => {
  it('pending accounts cannot submit donations', async () => {
    asMember();
    dbMock.instance = makeDbMock({ selectQueue: [[{ ...member, status: 'pending' }]] });
    const { submitDonation } = await import('@/app/actions');
    await expect(submitDonation({ amount: 100, pool: 'sadaqah', monthLabel: 'May 2026' }))
      .rejects.toThrow(/not approved/i);
  });

  it('negative and absurd amounts die at the schema gate', async () => {
    asMember();
    dbMock.instance = makeDbMock({ selectQueue: [[member]] });
    const { submitDonation } = await import('@/app/actions');
    await expect(submitDonation({ amount: -100, pool: 'sadaqah', monthLabel: 'May 2026' })).rejects.toThrow();
    await expect(submitDonation({ amount: 20_000_000, pool: 'sadaqah', monthLabel: 'May 2026' })).rejects.toThrow();
  });
});

describe('adminVerifyEmailByAddress — the OTP escape hatch stays admin-only', () => {
  it('refuses non-admin callers', async () => {
    asMember();
    dbMock.instance = makeDbMock({ selectQueue: [[member]] });
    const { adminVerifyEmailByAddress } = await import('@/app/actions');
    await expect(adminVerifyEmailByAddress('mata@example.com')).rejects.toThrow(/admin only/i);
  });

  it('rejects malformed email before touching the db', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({ selectQueue: [[admin]] });
    const { adminVerifyEmailByAddress } = await import('@/app/actions');
    await expect(adminVerifyEmailByAddress('not-an-email')).rejects.toThrow(/invalid email/i);
  });

  it('throws when no account matches (conditional update returns empty)', async () => {
    asAdmin();
    dbMock.instance = makeDbMock({ selectQueue: [[admin]], updateResult: [] });
    const { adminVerifyEmailByAddress } = await import('@/app/actions');
    await expect(adminVerifyEmailByAddress('ghost@example.com')).rejects.toThrow(/no account/i);
  });
});

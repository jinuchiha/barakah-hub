import { NextResponse } from 'next/server';
import { recordHeartbeat } from '@/lib/cron-heartbeat';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { members, payments, loans, cases, auditLog, repayments, config as configTbl } from '@/lib/db/schema';
import { sendWeeklyBackupEmail } from '@/lib/email';
import { outboxHealth } from '@/lib/outbox';
import { poolBalances } from '@/lib/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Cron jobs fan out over the whole membership. At the platform default they
// are killed mid-loop with no error and no retry, so the work silently
// half-completes as the family grows.
export const maxDuration = 300;

/**
 * Weekly backup snapshot — every Sunday at 2 AM.
 * Fetches key tables and emails a CSV summary + row counts to the admin.
 * Real point-in-time recovery is handled by Neon's built-in PITR, but this
 * gives a human-readable weekly summary and an extra safety net.
 *
 * Trigger: Vercel Cron (vercel.json "0 2 * * 0")
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [memberRows, paymentRows, loanRows, caseRows, auditRows, repaymentRows, [cfg]] = await Promise.all([
    db.select().from(members).orderBy(desc(members.createdAt)),
    db.select().from(payments).orderBy(desc(payments.createdAt)),
    db.select().from(loans).orderBy(desc(loans.issuedOn)),
    db.select().from(cases).orderBy(desc(cases.createdAt)),
    db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(1000),
    db.select().from(repayments),
    db.select().from(configTbl).limit(1),
  ]);

  // Ledger reconcile — the non-transactional repayment path in
  // app/actions.ts relies on this weekly check: loans.paid must equal
  // SUM(repayments.amount) per loan. A mismatch means an insert failed
  // between the UPDATE and the repayment row landing.
  const paidByLoan = new Map<string, number>();
  for (const r of repaymentRows) {
    paidByLoan.set(r.loanId, (paidByLoan.get(r.loanId) ?? 0) + r.amount);
  }
  const mismatches = loanRows
    .filter((l) => l.paid !== (paidByLoan.get(l.id) ?? 0))
    .map((l) => ({ loanId: l.id, ledgerPaid: l.paid, repaymentsSum: paidByLoan.get(l.id) ?? 0 }));
  if (mismatches.length > 0) {
    // targetId is an FK to members — loan IDs go in detail only.
    await db.insert(auditLog).values(
      mismatches.map((m) => ({
        action: 'ledger-reconcile-mismatch',
        detail: `Loan ${m.loanId}: loans.paid=${m.ledgerPaid} but SUM(repayments)=${m.repaymentsSum}`,
      })),
    );
  }

  // Disburse reconcile — disburseCase marks the case first, then inserts
  // the qarz loan (no transaction on neon-http). A crash in between leaves
  // a disbursed qarz case with NO loan row, i.e. untracked debt. Heal it:
  // the loan is fully derivable from the case and keyed on caseId, so this
  // insert is idempotent across double-fired crons.
  const loanCaseIds = new Set(loanRows.map((l) => l.caseId).filter(Boolean));
  const orphanQarzCases = caseRows.filter(
    (c) => c.caseType === 'qarz' && c.status === 'disbursed' && !loanCaseIds.has(c.id),
  );
  let healed = 0;
  for (const c of orphanQarzCases) {
    // The claim above ("keyed on caseId, so idempotent") was not enforced by
    // anything: loans.case_id had no UNIQUE constraint, so two overlapping
    // cron runs could each observe the same orphan and each insert a loan,
    // doubling a borrower's recorded debt. Migration 0017 adds the partial
    // unique index; ON CONFLICT DO NOTHING now makes the loser a no-op
    // instead of an error, so the claim is true by construction.
    const inserted = await db.insert(loans).values({
      memberId: c.applicantId,
      amount: c.amount,
      purpose: c.reasonEn,
      pool: 'qarz',
      city: c.city,
      caseId: c.id,
      paid: 0,
      active: true,
    }).onConflictDoNothing().returning({ id: loans.id });

    // Only audit the run that actually created the row.
    if (inserted.length > 0) {
      healed++;
      await db.insert(auditLog).values({
        action: 'ledger-reconcile-healed',
        detail: `Disbursed qarz case ${c.id} had no loan row · auto-created ${c.amount} loan for ${c.beneficiaryName}`,
        targetId: c.applicantId,
      });
    }
  }

  // Outflow picture — the fund total everywhere is gross verified income;
  // surface the disbursed/outstanding side in the weekly summary so an
  // over-commitment is visible to a human even without a debit ledger.
  const disbursedTotal = caseRows.filter((c) => c.status === 'disbursed').reduce((s, c) => s + c.amount, 0);
  const qarzOutstanding = loanRows.filter((l) => l.active).reduce((s, l) => s + (l.amount - l.paid), 0);

  const [ledgerPosition, delivery] = await Promise.all([poolBalances(), outboxHealth()]);

  const date = new Date().toISOString().slice(0, 10);
  const summary = {
    date,
    members: { total: memberRows.length, approved: memberRows.filter((m) => m.status === 'approved').length },
    payments: { total: paymentRows.length, verified: paymentRows.filter((p) => p.status === 'verified').length, pending: paymentRows.filter((p) => p.pendingVerify).length },
    loans: { total: loanRows.length, active: loanRows.filter((l) => l.active).length },
    cases: { total: caseRows.length, approved: caseRows.filter((c) => c.status === 'approved').length },
    auditEntries: auditRows.length,
    fundTotal: paymentRows.filter((p) => p.status === 'verified').reduce((s, p) => s + p.amount, 0),
    outflows: { disbursedTotal, qarzOutstanding, netAfterDisbursed: paymentRows.filter((p) => p.status === 'verified').reduce((s, p) => s + p.amount, 0) - disbursedTotal },
    ledgerReconcile: { loansChecked: loanRows.length, mismatches, healedQarzCases: healed },
    // The real position, from the ledger, alongside the gross inflow above.
    // "How much has the family given" and "how much can we commit" are
    // different questions and the summary should answer both.
    ledger: ledgerPosition,
    // Notification delivery, which previously had no number at all. A
    // non-zero `dead` count means something needs fixing — most likely a
    // missing WHATSAPP_TEMPLATE_* or RESEND_API_KEY.
    notifications: delivery,
    config: cfg ? { voteThreshold: cfg.voteThresholdPct, easyPaise: cfg.easyPaiseNumber ?? 'not set' } : null,
  };

  // Send email with summary if RESEND is configured
  try {
    await sendWeeklyBackupEmail(summary);
  } catch {
    // Email failure doesn't fail the backup job — log and continue
    console.warn('[weekly-backup] email send failed');
  }

  await recordHeartbeat('weekly-backup', 'ok');
  return NextResponse.json({ ok: true, summary });
}

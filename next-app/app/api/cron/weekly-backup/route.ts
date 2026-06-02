import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { members, payments, loans, cases, auditLog, config as configTbl } from '@/lib/db/schema';
import { sendWeeklyBackupEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const [memberRows, paymentRows, loanRows, caseRows, auditRows, [cfg]] = await Promise.all([
    db.select().from(members).orderBy(desc(members.createdAt)),
    db.select().from(payments).orderBy(desc(payments.createdAt)),
    db.select().from(loans).orderBy(desc(loans.issuedOn)),
    db.select().from(cases).orderBy(desc(cases.createdAt)),
    db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(1000),
    db.select().from(configTbl).limit(1),
  ]);

  const date = new Date().toISOString().slice(0, 10);
  const summary = {
    date,
    members: { total: memberRows.length, approved: memberRows.filter((m) => m.status === 'approved').length },
    payments: { total: paymentRows.length, verified: paymentRows.filter((p) => !p.pendingVerify).length, pending: paymentRows.filter((p) => p.pendingVerify).length },
    loans: { total: loanRows.length, active: loanRows.filter((l) => l.active).length },
    cases: { total: caseRows.length, approved: caseRows.filter((c) => c.status === 'approved').length },
    auditEntries: auditRows.length,
    fundTotal: paymentRows.filter((p) => !p.pendingVerify).reduce((s, p) => s + p.amount, 0),
    config: cfg ? { voteThreshold: cfg.voteThresholdPct, easyPaise: cfg.easyPaiseNumber ?? 'not set' } : null,
  };

  // Send email with summary if RESEND is configured
  try {
    await sendWeeklyBackupEmail(summary);
  } catch {
    // Email failure doesn't fail the backup job — log and continue
    console.warn('[weekly-backup] email send failed');
  }

  return NextResponse.json({ ok: true, summary });
}

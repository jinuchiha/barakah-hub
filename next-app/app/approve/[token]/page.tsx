import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { payments, members, auditLog } from '@/lib/db/schema';
import { verifyApproveToken } from '@/lib/approve-token';
import { notifyMembers, adminIds } from '@/lib/notify';
import { fmtRs } from '@/lib/i18n/dict';
import { Crescent as CrescentMark } from '@/components/icons/crescent';

export const metadata = { title: 'Approve Payment · Barakah Hub' };
export const dynamic = 'force-dynamic';

/**
 * One-tap supervisor approval, straight from the email/WhatsApp link.
 * The signed token IS the authentication — it names (payment, approver)
 * and expires in 7 days. This GET page only READS; the approve/reject
 * are POSTed server actions that re-verify the token, so mail scanners
 * prefetching the URL can never act on the payment.
 */

async function loadState(token: string) {
  const payload = verifyApproveToken(token);
  if (!payload) return { kind: 'invalid' as const };
  const [p] = await db.select().from(payments).where(eq(payments.id, payload.p)).limit(1);
  const [approver] = await db.select().from(members).where(eq(members.id, payload.a)).limit(1);
  if (!p || !approver) return { kind: 'invalid' as const };
  const eligible = approver.status === 'approved' && !approver.deceased
    && (approver.role === 'admin' || approver.role === 'supervisor');
  if (!eligible) return { kind: 'invalid' as const };
  const [donor] = await db.select().from(members).where(eq(members.id, p.memberId)).limit(1);
  if (!p.pendingVerify) return { kind: 'verified' as const, p, donor };
  if (p.supervisorRejectedAt) return { kind: 'rejected' as const, p, donor };
  if (p.supervisorApprovedAt) return { kind: 'approved' as const, p, donor };
  return { kind: 'ready' as const, p, donor, approver };
}

async function actViaToken(token: string, decision: 'approve' | 'reject') {
  'use server';
  const payload = verifyApproveToken(token);
  if (!payload) return;
  const [approver] = await db.select().from(members).where(eq(members.id, payload.a)).limit(1);
  if (!approver || approver.status !== 'approved' || approver.deceased) return;
  if (approver.role !== 'admin' && approver.role !== 'supervisor') return;

  if (decision === 'approve') {
    const updated = await db
      .update(payments)
      .set({
        supervisorApprovedAt: new Date(),
        supervisorApprovedById: approver.id,
        supervisorRejectedAt: null,
        supervisorRejectedById: null,
        supervisorRejectionNote: null,
      })
      .where(and(
        eq(payments.id, payload.p),
        eq(payments.pendingVerify, true),
        isNull(payments.supervisorApprovedAt),
      ))
      .returning();
    if (updated.length === 0) return;
    await db.insert(auditLog).values({
      actorId: approver.id,
      action: 'payment-supervisor-approved',
      detail: `Approved Rs ${updated[0].amount} ${updated[0].pool} via one-tap link · pending admin final verification`,
      targetId: updated[0].memberId,
    });
    await notifyMembers(
      await adminIds(approver.id),
      {
        titleEn: 'Payment ready to verify', titleUr: 'ادائیگی برائے تصدیق تیار',
        en: `A ${updated[0].pool} payment of Rs ${updated[0].amount.toLocaleString('en-PK')} was approved by the supervisor · awaiting your final verification.`,
        ur: `سپروائزر نے روپے ${updated[0].amount.toLocaleString('en-PK')} (${updated[0].pool}) کی منظوری دی · آپ کی حتمی تصدیق درکار ہے۔`,
        type: 'payment-awaiting-admin',
      },
      { title: '✅ Payment ready to verify', body: `Rs ${updated[0].amount.toLocaleString('en-PK')} ${updated[0].pool}`, data: { type: 'payment-awaiting-admin' }, channelId: 'payments' },
    );
  } else {
    const updated = await db
      .update(payments)
      .set({
        supervisorRejectedAt: new Date(),
        supervisorRejectedById: approver.id,
        supervisorRejectionNote: 'Rejected via one-tap link',
      })
      .where(and(
        eq(payments.id, payload.p),
        eq(payments.pendingVerify, true),
        isNull(payments.supervisorApprovedAt),
      ))
      .returning();
    if (updated.length === 0) return;
    await db.insert(auditLog).values({
      actorId: approver.id,
      action: 'payment-supervisor-rejected',
      detail: `Rejected Rs ${updated[0].amount} ${updated[0].pool} via one-tap link`,
      targetId: updated[0].memberId,
    });
  }
  revalidatePath('/admin/fund');
}

function StatusPill({ tone, children }: { tone: 'ok' | 'warn' | 'bad'; children: React.ReactNode }) {
  const cls = tone === 'ok'
    ? 'border-[rgba(45,138,95,0.45)] bg-[rgba(45,138,95,0.12)] text-[#4ec38d]'
    : tone === 'warn'
      ? 'border-[rgba(200,155,60,0.45)] bg-[rgba(200,155,60,0.12)] text-[var(--color-gold-2)]'
      : 'border-[rgba(220,82,82,0.45)] bg-[rgba(220,82,82,0.12)] text-[#f08585]';
  return (
    <div className={`mx-auto mb-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${cls}`}>
      {children}
    </div>
  );
}

export default async function ApprovePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const state = await loadState(token);

  return (
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[rgba(214,210,199,0.04)] p-8 text-center shadow-xl">
        <span className="mb-4 inline-grid size-12 place-items-center rounded-full bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)]">
          <CrescentMark className="size-6 text-[var(--color-ink)]" title="" />
        </span>

        {state.kind === 'invalid' ? (
          <>
            <StatusPill tone="bad">✕ Link expired or invalid</StatusPill>
            <p className="mt-3 text-sm text-[var(--txt-2)]">
              یہ لنک ختم ہو چکا ہے یا درست نہیں۔ Approvals queue سے منظور کریں۔
            </p>
          </>
        ) : (
          <>
            {state.kind === 'ready' ? <StatusPill tone="warn">🧾 منظوری درکار ہے · Awaiting your approval</StatusPill> : null}
            {state.kind === 'approved' ? <StatusPill tone="ok">✓ Approved · منظور شدہ (admin verification next)</StatusPill> : null}
            {state.kind === 'verified' ? <StatusPill tone="ok">✓ Fully verified · مکمل تصدیق شدہ</StatusPill> : null}
            {state.kind === 'rejected' ? <StatusPill tone="bad">✕ Rejected · مسترد</StatusPill> : null}

            <div className="num-display mt-2 text-4xl text-[var(--color-gold-2)]">{fmtRs(state.p.amount)}</div>
            <div className="mt-3 space-y-1 text-sm text-[var(--txt-2)]">
              <div>{state.donor ? (state.donor.nameUr || state.donor.nameEn) : 'Member'}</div>
              <div className="capitalize">{state.p.pool} · {state.p.monthLabel}</div>
              {state.p.note ? <div className="text-xs text-[var(--txt-3)]">Note: {state.p.note}</div> : null}
              <div className="num text-xs text-[var(--color-gold-4)]">#{state.p.id.slice(0, 8).toUpperCase()}</div>
            </div>

            {state.kind === 'ready' ? (
              <div className="mt-7 space-y-3">
                <p className="text-xs leading-relaxed text-[var(--txt-3)]">
                  منظور کا مطلب: یہ رقم آپ کے پاس پہنچ گئی ہے۔<br />
                  Approving confirms the cash reached you, {state.approver.nameUr || state.approver.nameEn}.
                </p>
                <form action={actViaToken.bind(null, token, 'approve')}>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-br from-[var(--color-gold-2)] to-[var(--color-gold)] px-6 py-3.5 text-base font-bold text-[var(--color-ink)] shadow-lg transition-transform active:scale-[0.98]"
                  >
                    ✓ Approve · منظور کریں
                  </button>
                </form>
                <form action={actViaToken.bind(null, token, 'reject')}>
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-[rgba(220,82,82,0.4)] bg-transparent px-6 py-2.5 text-sm font-semibold text-[#f08585] transition-colors hover:bg-[rgba(220,82,82,0.08)]"
                  >
                    ✕ Reject · مسترد کریں
                  </button>
                </form>
              </div>
            ) : null}
          </>
        )}
        <p className="mt-6 text-[11px] text-[var(--txt-4)]">Barakah Hub · two-person rule protected</p>
      </div>
    </main>
  );
}

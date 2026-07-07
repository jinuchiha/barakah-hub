import { NextResponse } from 'next/server';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { members, payments, loans, notifications } from '@/lib/db/schema';
import { sendPushToMembers } from '@/lib/push';
import { currentMonthLabel } from '@/lib/month';
import { buildPaymentReminder, sendWhatsAppTemplate, sendWhatsAppText } from '@/lib/whatsapp';
import { planStatus } from '@/lib/loan-math';
import { fmtRs } from '@/lib/i18n/dict';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Defaulter reminder — finds approved, non-deceased members who have NOT
 * submitted (or had recorded) their pledge for the current month and
 * sends them a notification + push. Idempotent: if a defaulter has
 * already been reminded for this month, we skip them.
 *
 * Trigger:
 *   - Vercel Cron (preferred — vercel.json schedule = "0 9 25 * *" runs
 *     9 AM on the 25th of each month)
 *   - Or manually: curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/reminders
 */
export async function GET(req: Request) {
  // Protect the endpoint — Vercel sets the auth header automatically.
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  // Fail closed: if no secret is configured, the endpoint is disabled
  // rather than left publicly triggerable.
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const monthLabel = currentMonthLabel();
  const reminderType = `pledge-reminder:${monthLabel}`;

  // Members who SHOULD pay this month (approved + not deceased + pledge > 0)
  const eligible = await db
    .select()
    .from(members)
    .where(and(eq(members.status, 'approved'), eq(members.deceased, false), sql`${members.monthlyPledge} > 0`));

  if (eligible.length === 0) return NextResponse.json({ reminded: 0, paid: 0, skipped: 0 });

  // Members who already have a payment for this month
  // A payment counts as "paid" while pending review, but NOT once the
  // supervisor rejected it — a rejected slip must not suppress the nudge.
  const paid = await db
    .select({ memberId: payments.memberId })
    .from(payments)
    .where(and(eq(payments.monthLabel, monthLabel), isNull(payments.supervisorRejectedAt)));
  const paidSet = new Set(paid.map((p) => p.memberId));

  // Members who already got reminded this month (idempotency)
  const alreadyReminded = await db
    .select({ recipientId: notifications.recipientId })
    .from(notifications)
    .where(eq(notifications.type, reminderType));
  const remindedSet = new Set(alreadyReminded.map((n) => n.recipientId));

  const defaulterMembers = eligible.filter((m) => !paidSet.has(m.id) && !remindedSet.has(m.id));
  const defaulters = defaulterMembers.map((m) => m.id);

  // Behind-schedule qarz borrowers get a nudge in the same run.
  const activeLoans = await db.select().from(loans).where(eq(loans.active, true));
  const now = new Date();
  const behind = activeLoans
    .map((l) => ({ loan: l, ps: planStatus(l, now) }))
    .filter(({ ps }) => ps.hasPlan && !ps.onTrack);
  const loanReminderType = `loan-reminder:${monthLabel}`;
  const loanReminded = new Set(
    (await db.select({ recipientId: notifications.recipientId }).from(notifications).where(eq(notifications.type, loanReminderType)))
      .map((n) => n.recipientId),
  );
  const behindFresh = behind.filter(({ loan }) => !loanReminded.has(loan.memberId));
  if (behindFresh.length > 0) {
    await db.insert(notifications).values(
      behindFresh.map(({ loan, ps }) => ({
        recipientId: loan.memberId,
        titleUr: 'قرض کی قسط',
        titleEn: 'Qarz installment due',
        ur: `آپ کے قرض کی قسطیں ${fmtRs(ps.shortfall)} پیچھے ہیں۔ براہِ کرم ادائیگی کریں۔`,
        en: `Your qarz repayments are ${fmtRs(ps.shortfall)} behind the agreed ${fmtRs(loan.installmentAmount ?? 0)}/month plan.`,
        type: loanReminderType,
      })),
    );
    void sendPushToMembers(behindFresh.map(({ loan }) => loan.memberId), {
      title: 'Qarz installment due',
      body: 'Your repayment plan is behind schedule · open the Loans tab.',
      data: { type: 'loan-reminder' },
      channelId: 'payments',
    }).catch(() => {});
  }

  if (defaulters.length === 0) {
    return NextResponse.json({ reminded: 0, paid: paid.length, skipped: eligible.length - paid.length, loanReminders: behindFresh.length });
  }

  // In-app notification (always lands, even if push is unconfigured)
  await db.insert(notifications).values(
    defaulters.map((id) => ({
      recipientId: id,
      titleUr: 'یاد دہانی',
      titleEn: `Monthly pledge: ${monthLabel}`,
      ur: `براہِ مہربانی ${monthLabel} کی ماہانہ شراکت ادا کر دیں۔`,
      en: `Reminder: Your monthly pledge for ${monthLabel} is still pending. Open My Account to submit.`,
      type: reminderType,
    })),
  );

  // Push (best effort — won't block if no Expo tokens registered)
  const pushRes = await sendPushToMembers(defaulters, {
    title: '🔔 Pledge reminder',
    body: `Your monthly contribution for ${monthLabel} is still pending.`,
    data: { type: 'pledge-reminder', monthLabel },
    channelId: 'payments',
  });

  // WhatsApp — where Pakistani families actually read reminders. Uses an
  // approved template when configured (required outside a 24h session);
  // falls back to free-text for any member with an open session window.
  // Chunked parallel sends — a big family serially would brush the
  // function timeout; 5-at-a-time keeps latency flat without hammering
  // the Graph API.
  let waSent = 0;
  const template = process.env.WHATSAPP_TEMPLATE_REMINDER;
  const withPhone = defaulterMembers.filter((m) => m.phone);
  for (let i = 0; i < withPhone.length; i += 5) {
    const results = await Promise.allSettled(
      withPhone.slice(i, i + 5).map((m) =>
        template
          ? sendWhatsAppTemplate(m.phone!, template, [m.nameUr || m.nameEn, monthLabel, fmtRs(m.monthlyPledge)])
          : sendWhatsAppText(m.phone!, buildPaymentReminder(m, monthLabel)),
      ),
    );
    waSent += results.filter((r) => r.status === 'fulfilled' && r.value).length;
  }

  return NextResponse.json({
    reminded: defaulters.length,
    paid: paid.length,
    skipped: eligible.length - paid.length - defaulters.length,
    pushSent: pushRes.sent,
    pushInvalid: pushRes.invalid,
    whatsappSent: waSent,
    loanReminders: behindFresh.length,
  });
}

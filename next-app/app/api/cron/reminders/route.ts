import { NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { members, payments, notifications } from '@/lib/db/schema';
import { sendPushToMembers } from '@/lib/push';
import { currentMonthLabel } from '@/lib/month';

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
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const monthLabel = currentMonthLabel();
  const reminderType = `pledge-reminder:${monthLabel}`;

  // Members who SHOULD pay this month (approved + not deceased + pledge > 0)
  const eligible = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.status, 'approved'), eq(members.deceased, false), sql`${members.monthlyPledge} > 0`));

  if (eligible.length === 0) return NextResponse.json({ reminded: 0, paid: 0, skipped: 0 });

  // Members who already have a payment for this month
  const paid = await db
    .select({ memberId: payments.memberId })
    .from(payments)
    .where(eq(payments.monthLabel, monthLabel));
  const paidSet = new Set(paid.map((p) => p.memberId));

  // Members who already got reminded this month (idempotency)
  const alreadyReminded = await db
    .select({ recipientId: notifications.recipientId })
    .from(notifications)
    .where(eq(notifications.type, reminderType));
  const remindedSet = new Set(alreadyReminded.map((n) => n.recipientId));

  const defaulters = eligible
    .filter((m) => !paidSet.has(m.id) && !remindedSet.has(m.id))
    .map((m) => m.id);

  if (defaulters.length === 0) return NextResponse.json({ reminded: 0, paid: paid.length, skipped: eligible.length - paid.length });

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

  return NextResponse.json({
    reminded: defaulters.length,
    paid: paid.length,
    skipped: eligible.length - paid.length - defaulters.length,
    pushSent: pushRes.sent,
    pushInvalid: pushRes.invalid,
  });
}

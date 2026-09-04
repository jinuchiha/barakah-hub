import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { members, notifications, users } from '@/lib/db/schema';
import { sendPushToMembers, type PushPayload } from '@/lib/push';
import { sendPaymentReviewEmail, sendNewMemberEmail, type ReviewInput } from '@/lib/email';
import { sendWhatsAppText } from '@/lib/whatsapp';
import { signApproveToken } from '@/lib/approve-token';
import { runAfterResponse } from '@/lib/after-response';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://barakah-hub.vercel.app';

export interface NotifContent {
  titleEn: string;
  titleUr: string;
  en: string;
  ur: string;
  type: string;
}

/** In-app notification (one row per recipient) + optional push. Push is
 *  fire-and-forget so delivery never blocks the caller. */
export async function notifyMembers(
  recipientIds: string[],
  n: NotifContent,
  push?: PushPayload,
): Promise<void> {
  if (recipientIds.length === 0) return;
  await db.insert(notifications).values(
    recipientIds.map((id) => ({
      recipientId: id, titleEn: n.titleEn, titleUr: n.titleUr, en: n.en, ur: n.ur, type: n.type,
    })),
  );
  if (push) runAfterResponse('notify.push', () => sendPushToMembers(recipientIds, push));
}

/** Approved, living members who can act on fund approvals (admins +
 *  supervisors), excluding the actor. */
export async function fundApproverIds(excludeId?: string): Promise<string[]> {
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(and(
      eq(members.deceased, false),
      eq(members.status, 'approved'),
      inArray(members.role, ['admin', 'supervisor']),
    ));
  return rows.filter((r) => r.id !== excludeId).map((r) => r.id);
}

/**
 * Email every fund approver (supervisors + admins) a receipt-style
 * "payment awaiting review" — the in-app/push twin of notifyMembers.
 * Fire-and-forget from callers: email failure must never block a payment.
 */
export async function emailFundApprovers(review: ReviewInput, excludeId?: string): Promise<void> {
  const rows = await db
    .select({ id: members.id, email: users.email, phone: members.phone })
    .from(members)
    .innerJoin(users, eq(users.id, members.authId))
    .where(and(
      eq(members.deceased, false),
      eq(members.status, 'approved'),
      inArray(members.role, ['admin', 'supervisor']),
      isNotNull(users.email),
    ));
  const recipients = rows.filter((r) => r.id !== excludeId && r.email);
  await Promise.allSettled(
    recipients.map((r) => {
      // Per-recipient one-tap link — the token IS the login, so the
      // supervisor can approve straight from the email on their phone.
      const approveUrl = review.paymentId
        ? `${APP_URL}/approve/${signApproveToken(review.paymentId, r.id)}`
        : undefined;
      const jobs: Promise<unknown>[] = [sendPaymentReviewEmail(r.email, { ...review, approveUrl })];
      if (r.phone && approveUrl) {
        jobs.push(sendWhatsAppText(
          r.phone,
          `🧾 *نئی ادائیگی برائے منظوری*\n\n${review.memberName} · Rs ${review.amount.toLocaleString('en-PK')} (${review.pool})\nمہینہ: ${review.monthLabel}\n\nایک ٹیپ سے منظور کریں:\n${approveUrl}`,
        ));
      }
      return Promise.allSettled(jobs);
    }),
  );
}

/** Approved, living admins, excluding the actor. */
export async function adminIds(excludeId?: string): Promise<string[]> {
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(and(
      eq(members.deceased, false),
      eq(members.status, 'approved'),
      eq(members.role, 'admin'),
    ));
  return rows.filter((r) => r.id !== excludeId).map((r) => r.id);
}

/**
 * New-registration alert: every admin gets an email and (env-gated) a
 * WhatsApp text, on top of the in-app/push row the caller already sends.
 * Fire-and-forget — a mail failure must never block a signup.
 */
export async function alertAdminsNewMember(memberName: string): Promise<void> {
  const rows = await db
    .select({ email: users.email, phone: members.phone })
    .from(members)
    .innerJoin(users, eq(users.id, members.authId))
    .where(and(
      eq(members.deceased, false),
      eq(members.status, 'approved'),
      eq(members.role, 'admin'),
      isNotNull(users.email),
    ));
  await Promise.allSettled(
    rows.flatMap((r) => {
      const jobs: Promise<unknown>[] = [];
      if (r.email) jobs.push(sendNewMemberEmail(r.email, memberName));
      if (r.phone) {
        jobs.push(sendWhatsAppText(
          r.phone,
          `👤 *نیا رکن · منظوری درکار*

${memberName} نے رجسٹریشن کی ہے اور آپ کی منظوری کا منتظر ہے۔

${APP_URL}/admin/members`,
        ));
      }
      return jobs;
    }),
  );
}

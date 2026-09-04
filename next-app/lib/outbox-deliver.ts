import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { members, users, type OutboxMessage } from '@/lib/db/schema';
import { sendEmail } from '@/lib/email';
import { sendWhatsAppBusinessMessage } from '@/lib/whatsapp';
import { sendPushToMembers } from '@/lib/push';

/**
 * Turn one queued message into an actual send.
 *
 * Separated from lib/outbox.ts (which owns the queue) so the queue mechanics
 * can be tested without stubbing three providers, and so adding a channel
 * touches one file.
 *
 * Contract: resolve normally when delivered, THROW when not. The caller
 * (`/api/cron/outbox`) turns a throw into a backoff or a dead letter. So a
 * provider returning "rejected" must throw here rather than returning
 * quietly — returning quietly is exactly the bug the outbox exists to fix.
 */

export interface DeliveryResult {
  delivered: boolean;
  /** Set when the message can never succeed, so retrying is pointless. */
  permanentFailure?: string;
}

/** Resolve the address for a channel at SEND time, not enqueue time, so a
 *  member updating their phone or email fixes queued messages too. */
async function resolveRecipient(
  channel: OutboxMessage['channel'],
  memberId: string | null,
): Promise<{ email?: string; phone?: string; memberId?: string } | null> {
  if (!memberId) return null;

  const [row] = await db
    .select({ phone: members.phone, authId: members.authId, id: members.id })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  if (!row) return null;

  if (channel === 'push') return { memberId: row.id };
  if (channel === 'whatsapp') return { phone: row.phone ?? undefined };

  if (!row.authId) return null;
  const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, row.authId)).limit(1);
  return { email: u?.email };
}

export async function deliver(msg: OutboxMessage): Promise<DeliveryResult> {
  const p = (msg.payload ?? {}) as Record<string, unknown>;
  const str = (k: string): string => String(p[k] ?? '');

  const recipient = await resolveRecipient(msg.channel, msg.memberId);
  if (!recipient) {
    // No address and no way to get one. Retrying cannot help.
    return { delivered: false, permanentFailure: 'No recipient address for this member' };
  }

  switch (msg.channel) {
    case 'email': {
      if (!recipient.email) {
        return { delivered: false, permanentFailure: 'Member has no email address' };
      }
      // sendEmail already no-ops without RESEND_API_KEY. That must NOT count
      // as delivered — an unconfigured provider is a configuration failure,
      // and the message should stay queued until it is fixed.
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY not configured — message stays queued');
      }
      await sendEmail(recipient.email, str('subject'), str('body'));
      return { delivered: true };
    }

    case 'whatsapp': {
      if (!recipient.phone) {
        return { delivered: false, permanentFailure: 'Member has no phone number' };
      }
      const res = await sendWhatsAppBusinessMessage(recipient.phone, {
        templateEnvVar: str('templateEnvVar'),
        templateParams: Array.isArray(p.templateParams) ? (p.templateParams as string[]) : [],
        fallbackText: str('fallbackText'),
      });
      if (res.ok) return { delivered: true };
      // Outside the 24-hour window with no template configured, retrying the
      // same free text will fail identically until an operator sets the
      // template env var. Mark it permanent so it lands in `dead` and shows
      // up as something to FIX rather than churning the queue forever.
      if (res.reason === 'outside-session-window') {
        return {
          delivered: false,
          permanentFailure:
            'Rejected: outside the 24-hour window and no approved template configured. ' +
            `Set ${str('templateEnvVar')} to deliver this message type.`,
        };
      }
      throw new Error(`WhatsApp ${res.reason}${res.detail ? `: ${res.detail}` : ''}`);
    }

    case 'push': {
      const result = await sendPushToMembers([recipient.memberId!], {
        title: str('title'),
        body: str('body'),
        data: (p.data as Record<string, unknown>) ?? {},
        channelId: (p.channelId as 'payments' | 'cases' | 'messages' | 'admin') ?? undefined,
      });
      if (result.sent > 0) return { delivered: true };
      if (result.invalid > 0 && result.failed === 0) {
        // Expo rejected the token itself (uninstalled, malformed). It has
        // already been pruned; retrying achieves nothing.
        return { delivered: false, permanentFailure: 'Push token rejected by Expo' };
      }
      if (result.sent === 0 && result.invalid === 0 && result.failed === 0) {
        return { delivered: false, permanentFailure: 'Member has no registered device' };
      }
      throw new Error(`Push delivery unconfirmed (${result.failed} failed)`);
    }
  }
}

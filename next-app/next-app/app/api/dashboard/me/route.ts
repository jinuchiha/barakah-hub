import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { payments, auditLog } from '@/lib/db/schema';
import { currentMonthLabel } from '@/lib/month';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const me = await meOrThrow();

    const monthLabel = currentMonthLabel();
    const myPaymentsThisMonth = await db
      .select()
      .from(payments)
      .where(eq(payments.memberId, me.id))
      .orderBy(desc(payments.createdAt))
      .limit(20);

    const currentMonthPayment =
      myPaymentsThisMonth.find((p) => p.monthLabel === monthLabel) ?? null;

    const recentAudit = await db
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt))
      .limit(30);

    const isAdmin = me.role === 'admin';

    /**
     * Privacy policy for the activity feed (per user request 2026-05-15):
     *
     *  - Every donation is anonymous to other members. Non-admin viewers
     *    must never be able to learn who gave what. Previously we leaked
     *    donor identity through the audit detail string and the activity
     *    icon coloured by donor.
     *  - The donor themselves and admins still see full details so they
     *    can recognise their own contributions / verify receipts.
     *  - Sadqa is "given in secret" by Islamic principle, so for non-self
     *    donations we collapse the entry to "Anonymous donation" with no
     *    pool / amount / month exposed. The funds card already shows the
     *    aggregate going up — that's the visible signal.
     */
    const isPaymentAction = (action: string) => action.startsWith('payment');
    // Only these event families are appropriate for ordinary members.
    // Emergency cases + loans (qarz) are community-known by design (voting /
    // repayment tracking need identity). Everything else — member edits,
    // profile/name changes, approvals, votes, broadcasts, config — is
    // internal/admin and must NOT appear in the public feed.
    const isPublicForMembers = (action: string) =>
      action.startsWith('case') || action.startsWith('emergency') || action.startsWith('loan');
    const humanize = (action: string) =>
      action.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const recentActivity = recentAudit
      .map((entry) => {
        const isSelf = entry.actorId === me.id;
        const isPayment = isPaymentAction(entry.action);

        // Admins see the full audit trail.
        if (isAdmin) {
          return {
            id: entry.id,
            type: mapActionToType(entry.action),
            title: isSelf && isPayment ? 'Your donation' : humanize(entry.action),
            subtitle: entry.detail ?? undefined,
            timestamp: entry.createdAt.toISOString(),
            anonymous: false,
          };
        }

        // Own donation — visible to the donor only.
        if (isPayment && isSelf) {
          return {
            id: entry.id, type: 'payment' as const, title: 'Your donation',
            subtitle: entry.detail ?? undefined,
            timestamp: entry.createdAt.toISOString(), anonymous: false,
          };
        }

        // Others' donations — fully anonymised (sadqa is given in secret).
        if (isPayment) {
          return {
            id: entry.id, type: 'payment' as const, title: 'Anonymous donation',
            subtitle: undefined,
            timestamp: entry.createdAt.toISOString(), anonymous: true,
          };
        }

        // Public community events (cases + loans) only.
        if (isPublicForMembers(entry.action)) {
          return {
            id: entry.id, type: mapActionToType(entry.action),
            title: humanize(entry.action), subtitle: entry.detail ?? undefined,
            timestamp: entry.createdAt.toISOString(), anonymous: false,
          };
        }

        // Internal/admin activity (member edits, name changes, approvals,
        // votes, broadcasts, config) — hidden from ordinary members.
        return null;
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .slice(0, 8);

    return NextResponse.json({ member: me, currentMonthPayment, recentActivity });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

function mapActionToType(action: string): 'payment' | 'vote' | 'case' | 'loan' | 'member' {
  if (action.startsWith('payment')) return 'payment';
  if (action.startsWith('vote') || action.startsWith('emergency')) return 'vote';
  if (action.startsWith('loan')) return 'loan';
  if (action.startsWith('member')) return 'member';
  return 'payment';
}

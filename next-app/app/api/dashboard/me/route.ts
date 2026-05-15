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

    const recentActivity = recentAudit
      .map((entry) => {
        const isSelf = entry.actorId === me.id;
        const isPayment = isPaymentAction(entry.action);

        // Other people's payments — heavily anonymise.
        if (isPayment && !isSelf && !isAdmin) {
          return {
            id: entry.id,
            type: 'payment' as const,
            title: 'Anonymous donation',
            subtitle: undefined,
            timestamp: entry.createdAt.toISOString(),
            anonymous: true,
          };
        }

        // Own payment — still shows "Your donation" but no extra identity.
        if (isPayment && isSelf) {
          return {
            id: entry.id,
            type: 'payment' as const,
            title: 'Your donation',
            subtitle: entry.detail ?? undefined,
            timestamp: entry.createdAt.toISOString(),
            anonymous: false,
          };
        }

        // Non-payment activity (votes, cases, loans, members) — keep the
        // detail since these are intentionally public for community trust.
        return {
          id: entry.id,
          type: mapActionToType(entry.action),
          title: entry.action.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          subtitle: entry.detail ?? undefined,
          timestamp: entry.createdAt.toISOString(),
          anonymous: false,
        };
      })
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

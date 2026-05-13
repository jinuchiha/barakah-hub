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
      .limit(20);

    const isAdmin = me.role === 'admin';
    // Sadaqah/Zakat payment activity is private — hide details when the
    // viewer isn't the donor or an admin. The aggregate (running total)
    // is still shown via the fund card, but who-gave-what stays between
    // the donor and the treasurer.
    const isPrivatePaymentAction = (action: string, detail: string | null) => {
      if (!action.startsWith('payment')) return false;
      const d = (detail ?? '').toLowerCase();
      return d.includes('sadaqah') || d.includes('zakat');
    };

    const recentActivity = recentAudit
      .filter((entry) => {
        if (isAdmin) return true;
        if (entry.actorId === me.id) return true;
        return !isPrivatePaymentAction(entry.action, entry.detail);
      })
      .slice(0, 8)
      .map((entry) => {
        const isOwnPrivate = entry.actorId === me.id && isPrivatePaymentAction(entry.action, entry.detail);
        return {
          id: entry.id,
          type: mapActionToType(entry.action),
          title: entry.action.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          // For non-self private payments, strip donor reference from detail
          subtitle: entry.detail ?? undefined,
          timestamp: entry.createdAt.toISOString(),
          anonymous: !isAdmin && entry.actorId !== me.id && isPrivatePaymentAction(entry.action, entry.detail),
          isOwnPrivate,
        };
      });

    return NextResponse.json({ member: me, currentMonthPayment, recentActivity });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

function mapActionToType(action: string): string {
  if (action.startsWith('payment')) return 'payment';
  if (action.startsWith('vote') || action.startsWith('emergency')) return 'vote';
  if (action.startsWith('loan')) return 'loan';
  if (action.startsWith('member')) return 'member';
  return 'payment';
}

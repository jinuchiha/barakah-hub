import { eq, and, asc, ne, or, sql } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import TreeView from './tree-view';

export const metadata = { title: 'Family Tree · Barakah Hub' };

export default async function TreePage() {
  const me = await getMeOrRedirect();

  // Tree shows approved (living + deceased — deceased render as
  // "Rahimahullah") but NEVER rejected. Pending shown to admin only
  // so they can see the lineage of a new applicant during review.
  const isAdmin = me.role === 'admin';
  const statusFilter = isAdmin
    ? or(eq(members.status, 'approved'), eq(members.status, 'pending'))
    : eq(members.status, 'approved');
  const all = await db
    .select()
    .from(members)
    .where(and(statusFilter, ne(members.status, 'rejected')))
    .orderBy(asc(members.nameEn));

  // Aggregate paid amount per member via SQL — sadqa privacy: non-admins
  // only get their own total; the rest are stripped before crossing the network.
  const totalsQuery = isAdmin
    ? db
        .select({ memberId: payments.memberId, total: sql<number>`SUM(${payments.amount})::int` })
        .from(payments)
        .where(eq(payments.status, 'verified'))
        .groupBy(payments.memberId)
    : db
        .select({ memberId: payments.memberId, total: sql<number>`SUM(${payments.amount})::int` })
        .from(payments)
        .where(and(eq(payments.status, 'verified'), eq(payments.memberId, me.id)))
        .groupBy(payments.memberId);
  const paymentTotals = await totalsQuery;
  const paidByObj: Record<string, number> = Object.fromEntries(
    paymentTotals.map((t) => [t.memberId, Number(t.total)]),
  );

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <header className="mb-6 border-b border-[var(--border)] pb-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.5px] text-[var(--color-cream)]">Family Tree</h1>
        <p dir="rtl" className="font-[var(--font-arabic)] text-[15px] leading-8 text-[var(--color-gold-2)] [text-align:start]">خاندانی درخت</p>
        <p className="mt-1 text-sm text-[var(--txt-3)]">Click any node to expand. Father names and sibling counters are auto-detected.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Lineage</CardTitle>
          <span className="text-xs text-[var(--color-gold-4)]">{all.length} members</span>
        </CardHeader>
        <CardBody>
          <TreeView members={all} paidBy={paidByObj} viewerId={me.id} viewerIsAdmin={isAdmin} />
        </CardBody>
      </Card>
    </div>
  );
}

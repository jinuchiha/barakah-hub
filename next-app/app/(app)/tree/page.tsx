import { redirect } from 'next/navigation';
import { eq, and, asc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { members, payments } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import TreeView from './tree-view';

export const metadata = { title: 'Family Tree · Barakah Hub' };

export default async function TreePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [me] = await db.select().from(members).where(eq(members.authId, user.id)).limit(1);
  if (!me) redirect('/onboarding');

  const all = await db.select().from(members).orderBy(asc(members.nameEn));
  const isAdmin = me.role === 'admin';

  // Aggregate paid amount per member — sadqa privacy: non-admins only get
  // their own total; the rest are stripped before crossing the network.
  const totalsQuery = isAdmin
    ? db
        .select({ memberId: payments.memberId, total: payments.amount })
        .from(payments)
        .where(eq(payments.pendingVerify, false))
    : db
        .select({ memberId: payments.memberId, total: payments.amount })
        .from(payments)
        .where(and(eq(payments.pendingVerify, false), eq(payments.memberId, me.id)));
  const totals = await totalsQuery;
  const paidByObj: Record<string, number> = {};
  for (const t of totals) {
    paidByObj[t.memberId] = (paidByObj[t.memberId] ?? 0) + t.total;
  }

  return (
    <div>
      <header className="mb-6 border-b border-[var(--border)] pb-4">
        <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">خاندانی درخت</h1>
        <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Family tree — click any node to expand. Father names + sibling counters auto-detected.</p>
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

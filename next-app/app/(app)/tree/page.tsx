import { eq, asc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { members, payments } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import TreeView from './tree-view';
import type { Member } from '@/lib/db/schema';

export const metadata = { title: 'Family Tree · BalochSath' };

export default async function TreePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [me] = await db.select().from(members).where(eq(members.authId, user!.id)).limit(1);

  const all = await db.select().from(members).orderBy(asc(members.nameEn));

  // Aggregate paid amount per member for badge display
  const totals = await db
    .select({ memberId: payments.memberId, total: payments.amount })
    .from(payments)
    .where(eq(payments.pendingVerify, false));
  const paidByMap = new Map<string, number>();
  for (const t of totals) {
    paidByMap.set(t.memberId, (paidByMap.get(t.memberId) || 0) + t.amount);
  }
  const paidByObj: Record<string, number> = {};
  paidByMap.forEach((v, k) => { paidByObj[k] = v; });

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
          <TreeView members={all} paidBy={paidByObj} viewerId={me.id} viewerIsAdmin={me.role === 'admin'} />
        </CardBody>
      </Card>
    </div>
  );
}

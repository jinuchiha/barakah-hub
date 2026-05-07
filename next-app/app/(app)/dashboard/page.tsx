import { eq, and, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { members, payments, cases, loans, config as configTbl } from '@/lib/db/schema';
import { StatCard } from '@/components/stat-card';
import { GoalBar } from '@/components/goal-bar';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { fmtRs } from '@/lib/i18n/dict';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [me] = await db.select().from(members).where(eq(members.authId, user!.id)).limit(1);
  const isAdmin = me.role === 'admin';

  // ─── Aggregates (verified-only)
  const [totalRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount}),0)::int` })
    .from(payments)
    .where(eq(payments.pendingVerify, false));
  const totalFund = Number(totalRow?.total ?? 0);

  const [memberCount] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(members)
    .where(eq(members.deceased, false));

  const outstandingLoans = await db
    .select({ owed: sql<number>`COALESCE(SUM(${loans.amount} - ${loans.paid}),0)::int` })
    .from(loans)
    .where(eq(loans.active, true));

  const pendingVotes = await db.$count(cases, eq(cases.status, 'voting'));

  const [cfg] = await db.select().from(configTbl).where(eq(configTbl.id, 1)).limit(1);

  // ─── Last-6-month series for sparklines
  const series = await db
    .select({
      monthLabel: payments.monthLabel,
      total: sql<number>`SUM(${payments.amount})::int`,
    })
    .from(payments)
    .where(eq(payments.pendingVerify, false))
    .groupBy(payments.monthLabel)
    .orderBy(payments.monthLabel)
    .limit(6);
  const sparkValues = series.map((s) => Number(s.total));

  return (
    <div>
      <header className="mb-6 border-b border-[var(--border)] pb-4">
        <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">
          خوش آمدید — {me.nameUr || me.nameEn}
        </h1>
        <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Welcome to the Family Fund</p>
      </header>

      <GoalBar config={cfg} totalFund={totalFund} />

      {/* ─── Stat cards (admin sees all; member sees personal-only equivalents) */}
      <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {isAdmin ? (
          <>
            <StatCard label="Total Fund" value={fmtRs(totalFund)} hint={`👥 ${memberCount.c} members`} tone="emerald" spark={sparkValues} />
            <StatCard label="Members" value={memberCount.c} hint="✓ Active family" tone="gold" />
            <StatCard label="Outstanding Loans" value={fmtRs(Number(outstandingLoans[0]?.owed ?? 0))} hint="📋 Active qarz" tone="ruby" />
            <StatCard label="Pending Votes" value={pendingVotes} hint="⚡ Needs attention" tone="sapphire" />
          </>
        ) : (
          <MemberStats memberId={me.id} totalFund={totalFund} />
        )}
      </div>

      {/* ─── Privacy notice for members (sadqa anonymity reminder) */}
      {!isAdmin && (
        <Card className="mb-6 border-[var(--color-emerald-2)]/30">
          <CardBody className="text-center">
            <div className="mb-2 font-[var(--font-arabic)] text-sm text-[var(--color-emerald-2)]">
              🤲 خاندانی سرگرمی (سدقہ — گمنام)
            </div>
            <p className="text-sm text-[var(--txt-2)]">
              Total family contributions are visible. Individual donor names and amounts remain private — true spirit of sadqa.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{isAdmin ? 'Recent Activity' : 'My Recent Activity'}</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-[var(--txt-3)]">Activity feed loaded server-side via Drizzle • RLS protects sensitive rows</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Emergency Votes</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-[var(--txt-3)]">{pendingVotes} open • cast your vote in the Cases tab</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

async function MemberStats({ memberId, totalFund }: { memberId: string; totalFund: number }) {
  const [myTotal] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount}),0)::int` })
    .from(payments)
    .where(and(eq(payments.memberId, memberId), eq(payments.pendingVerify, false)));
  const my = Number(myTotal?.total ?? 0);
  const months = await db
    .selectDistinct({ m: payments.monthLabel })
    .from(payments)
    .where(and(eq(payments.memberId, memberId), eq(payments.pendingVerify, false)));
  return (
    <>
      <StatCard label="My Total Paid" value={fmtRs(my)} hint="🤲 جزاک اللہ خیر" tone="emerald" />
      <StatCard label="My Months Paid" value={`${months.length}/12`} hint={`📅 ${Math.round((months.length / 12) * 100)}% of year`} tone="gold" />
      <StatCard label="Family Fund" value={fmtRs(totalFund)} hint="👥 collective trust" tone="sapphire" />
    </>
  );
}

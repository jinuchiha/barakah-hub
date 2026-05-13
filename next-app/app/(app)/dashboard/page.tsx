import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import Link from 'next/link';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments, cases, votes, loans, config as configTbl, auditLog } from '@/lib/db/schema';
import { StatCard } from '@/components/stat-card';
import { GoalBar } from '@/components/goal-bar';
import { SpendingDonut, type DonutSlice } from '@/components/spending-donut';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { fmtRs } from '@/lib/i18n/dict';
import { ini } from '@/lib/utils';

export default async function DashboardPage() {
  const me = await getMeOrRedirect();
  const isAdmin = me.role === 'admin';

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
  const daysRemaining = computeDaysRemaining(cfg?.goalDeadline ?? null);

  const series = await db
    .select({ monthStart: payments.monthStart, total: sql<number>`SUM(${payments.amount})::int` })
    .from(payments)
    .where(eq(payments.pendingVerify, false))
    .groupBy(payments.monthStart)
    .orderBy(desc(payments.monthStart))
    .limit(6);
  const sparkValues = series.map((s) => Number(s.total)).reverse();

  // Open cases + vote tallies for the votes panel
  const openCases = await db
    .select()
    .from(cases)
    .where(eq(cases.status, 'voting'))
    .orderBy(desc(cases.createdAt))
    .limit(5);
  const openCaseIds = openCases.map((c) => c.id);
  const openVotes = openCaseIds.length
    ? await db.select().from(votes).where(inArray(votes.caseId, openCaseIds))
    : [];

  const eligibleCount = Math.max(0, (await db.$count(members, and(eq(members.deceased, false), eq(members.status, 'approved')))) - 1);
  const need = Math.ceil(eligibleCount * ((cfg?.voteThresholdPct ?? 50) / 100));

  // Pool-level totals for the spending breakdown donut (admin-only)
  const poolBreakdown = isAdmin
    ? await db
        .select({ pool: payments.pool, total: sql<number>`SUM(${payments.amount})::int` })
        .from(payments)
        .where(eq(payments.pendingVerify, false))
        .groupBy(payments.pool)
    : [];
  const POOL_META: Record<string, { label: string; color: string }> = {
    sadaqah: { label: 'Sadaqah · صدقہ', color: '#c89b3c' },
    zakat:   { label: 'Zakat · زکوٰۃ',   color: '#2d6a4f' },
    qarz:    { label: 'Qarz pool',       color: '#7a5fb8' },
  };
  const poolSlices: DonutSlice[] = poolBreakdown.map((p) => ({
    key: p.pool,
    label: POOL_META[p.pool]?.label ?? p.pool,
    value: Number(p.total),
    color: POOL_META[p.pool]?.color ?? '#8a8579',
  }));

  // Case-category disbursement breakdown (admin-only)
  const caseBreakdown = isAdmin
    ? await db
        .select({ category: cases.category, total: sql<number>`SUM(${cases.amount})::int` })
        .from(cases)
        .where(eq(cases.status, 'disbursed'))
        .groupBy(cases.category)
    : [];
  // Cycle through tasteful palette for case categories — we don't know
  // in advance what categories admin will use.
  const CATEGORY_PALETTE = ['#c89b3c', '#2d6a4f', '#7a5fb8', '#a83254', '#3a4a7a', '#a0671e', '#475569'];
  const caseSlices: DonutSlice[] = caseBreakdown.map((c, i) => ({
    key: c.category,
    label: c.category,
    value: Number(c.total),
    color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
  }));

  return (
    <div>
      <header className="mb-6 border-b border-[var(--border)] pb-4">
        <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">
          خوش آمدید — {me.nameUr || me.nameEn}
        </h1>
        <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Welcome to the Family Fund</p>
      </header>

      <GoalBar config={cfg} totalFund={totalFund} daysRemaining={daysRemaining} />

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

      {isAdmin && (poolSlices.length > 0 || caseSlices.length > 0) && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>💰 Fund Composition</CardTitle>
              <span className="text-[10px] uppercase tracking-widest text-[var(--color-gold-4)]">By pool</span>
            </CardHeader>
            <CardBody>
              <SpendingDonut title="Fund composition" slices={poolSlices} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>🎯 Disbursements</CardTitle>
              <span className="text-[10px] uppercase tracking-widest text-[var(--color-gold-4)]">Approved cases</span>
            </CardHeader>
            <CardBody>
              <SpendingDonut title="Disbursements by category" slices={caseSlices} />
            </CardBody>
          </Card>
        </div>
      )}

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
          <CardBody className="p-0">
            {isAdmin
              ? <AdminRecentActivity />
              : <MemberRecentActivity memberId={me.id} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>👥 Community Activity</CardTitle>
            <span className="text-[10px] uppercase tracking-widest text-[var(--color-gold-4)]">
              Sadaqah / Zakat anonymized
            </span>
          </CardHeader>
          <CardBody className="p-0">
            <CommunityActivity meId={me.id} isAdmin={isAdmin} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Emergency Votes</CardTitle>
            {pendingVotes > 0 && (
              <Link href="/cases" className="text-xs text-[var(--color-gold-4)] underline-offset-2 hover:underline">
                View all →
              </Link>
            )}
          </CardHeader>
          <CardBody className="p-0">
            {openCases.length === 0 ? (
              <div className="py-10 text-center text-sm italic text-[var(--txt-3)]">
                الحمدللہ · No open votes right now
              </div>
            ) : (
              openCases.map((c) => {
                const yes = openVotes.filter((v) => v.caseId === c.id && v.vote).length;
                const pct = eligibleCount > 0 ? Math.round((yes / eligibleCount) * 100) : 0;
                return (
                  <div key={c.id} className="flex items-center gap-3 border-b border-[rgba(214,210,199,0.06)] px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--color-cream)]">{c.beneficiaryName}</div>
                      <div className="text-[10px] text-[var(--color-gold-4)]">{c.category} · {fmtRs(c.amount)}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/20">
                          <div className="h-full bg-gradient-to-r from-[var(--color-emerald-2)] to-[var(--color-gold)]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-[var(--color-gold-4)]">{yes}/{need} needed</span>
                      </div>
                    </div>
                    <Link href="/cases" className="shrink-0 rounded-md border border-[rgba(30,42,74,0.4)] bg-[rgba(30,42,74,0.15)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-emerald-2)] hover:bg-[rgba(30,42,74,0.25)]">
                      Vote
                    </Link>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function computeDaysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - new Date().getTime();
  return Math.ceil(ms / 86_400_000);
}

async function MemberStats({ memberId, totalFund }: { memberId: string; totalFund: number }) {
  const yearStart = `${new Date().getUTCFullYear()}-01-01`;
  const monthsThisYearSoFar = new Date().getUTCMonth() + 1;

  const [myTotal] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount}),0)::int` })
    .from(payments)
    .where(and(eq(payments.memberId, memberId), eq(payments.pendingVerify, false)));
  const my = Number(myTotal?.total ?? 0);

  const months = await db
    .selectDistinct({ m: payments.monthStart })
    .from(payments)
    .where(and(eq(payments.memberId, memberId), eq(payments.pendingVerify, false), sql`${payments.monthStart} >= ${yearStart}::date`));

  return (
    <>
      <StatCard label="My Total Paid" value={fmtRs(my)} hint="🤲 جزاک اللہ خیر" tone="emerald" />
      <StatCard label="My Months Paid" value={`${months.length}/${monthsThisYearSoFar}`} hint={`📅 ${Math.round((months.length / monthsThisYearSoFar) * 100)}% of year so far`} tone="gold" />
      <StatCard label="Family Fund" value={fmtRs(totalFund)} hint="👥 collective trust" tone="sapphire" />
    </>
  );
}

const AUDIT_ICONS: Record<string, string> = {
  login: '🔓', logout: '🔒', 'member-approved': '✅', 'member-added': '➕',
  'payment-record': '💰', 'payment-verified': '✓', 'payment-self-submit': '🤲',
  'vote-cast': '🗳', 'emergency-create': '🚨', 'emergency-approved': '✓',
  'loan-issue': '📤', 'loan-repay': '↩', 'message-sent': '✉',
};

async function AdminRecentActivity() {
  const entries = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(6);
  const actorIds = [...new Set(entries.map((e) => e.actorId).filter((v): v is string => !!v))];
  const actors = actorIds.length
    ? await db.select({ id: members.id, nameEn: members.nameEn, nameUr: members.nameUr, color: members.color }).from(members).where(inArray(members.id, actorIds))
    : [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  if (entries.length === 0) {
    return <div className="py-10 text-center text-sm italic text-[var(--txt-3)]">No activity yet</div>;
  }
  return (
    <>
      {entries.map((e) => {
        const actor = e.actorId ? actorMap.get(e.actorId) : null;
        const icon = AUDIT_ICONS[e.action] ?? '•';
        return (
          <div key={e.id} className="flex items-center gap-3 border-b border-[rgba(214,210,199,0.06)] px-3 py-2.5">
            <div className="grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: actor?.color || '#555' }}>
              {actor ? ini(actor.nameEn || actor.nameUr) : '·'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[var(--color-cream)]">
                {icon} {e.action.replace(/-/g, ' ')}
              </div>
              <div className="text-[10px] text-[var(--color-gold-4)]">{actor?.nameEn || actor?.nameUr || 'system'}</div>
            </div>
            <div className="shrink-0 text-[10px] text-[var(--color-gold-4)]">
              {new Date(e.createdAt).toLocaleDateString('en-GB')}
            </div>
          </div>
        );
      })}
      <div className="border-t border-[rgba(214,210,199,0.06)] px-3 py-2 text-center">
        <Link href="/admin/audit" className="text-xs text-[var(--color-gold-4)] hover:text-[var(--color-gold)]">Full audit log →</Link>
      </div>
    </>
  );
}

/**
 * Mixed community feed — donations + new cases + new loans across all
 * members. Sadaqah / Zakat donor identity is replaced with "ایک رکن"
 * for non-admin viewers (Islamic principle: charity given in secret).
 * Qarz + emergency cases ARE public — borrower / applicant is shown.
 */
async function CommunityActivity({ meId, isAdmin }: { meId: string; isAdmin: boolean }) {
  const [recentPayments, recentCases, recentLoans] = await Promise.all([
    db.select().from(payments).where(eq(payments.pendingVerify, false)).orderBy(desc(payments.createdAt)).limit(8),
    db.select().from(cases).orderBy(desc(cases.createdAt)).limit(4),
    db.select().from(loans).orderBy(desc(loans.issuedOn)).limit(4),
  ]);

  const memberIds = new Set<string>();
  recentPayments.forEach((p) => memberIds.add(p.memberId));
  recentCases.forEach((c) => memberIds.add(c.applicantId));
  recentLoans.forEach((l) => memberIds.add(l.memberId));

  const memberRows = memberIds.size
    ? await db.select({ id: members.id, nameEn: members.nameEn, nameUr: members.nameUr, color: members.color })
        .from(members).where(inArray(members.id, [...memberIds]))
    : [];
  const memMap = new Map(memberRows.map((m) => [m.id, m]));

  function maskedActor(memberId: string, pool: string) {
    const isPrivate = pool === 'sadaqah' || pool === 'zakat';
    const isSelf = memberId === meId;
    if (!isPrivate || isSelf || isAdmin) {
      return memMap.get(memberId) ?? { nameEn: 'Member', color: '#475569' };
    }
    return { nameEn: 'A member', nameUr: 'ایک رکن', color: '#475569' };
  }

  // Build a merged, time-ordered feed
  type FeedItem =
    | { kind: 'payment'; id: string; ts: number; pool: string; amount: number; actor: { nameEn: string; nameUr?: string; color: string }; monthLabel: string; anon: boolean }
    | { kind: 'case'; id: string; ts: number; category: string; amount: number; beneficiary: string; status: string; emergency: boolean; applicant: { nameEn: string; color: string } }
    | { kind: 'loan'; id: string; ts: number; amount: number; paid: number; purpose: string; member: { nameEn: string; color: string } };

  const feed: FeedItem[] = [
    ...recentPayments.map((p) => {
      const isPrivate = (p.pool === 'sadaqah' || p.pool === 'zakat') && p.memberId !== meId && !isAdmin;
      return {
        kind: 'payment' as const,
        id: p.id,
        ts: new Date(p.createdAt).getTime(),
        pool: p.pool,
        amount: p.amount,
        actor: maskedActor(p.memberId, p.pool),
        monthLabel: p.monthLabel,
        anon: isPrivate,
      };
    }),
    ...recentCases.map((c) => ({
      kind: 'case' as const,
      id: c.id,
      ts: new Date(c.createdAt).getTime(),
      category: c.category,
      amount: c.amount,
      beneficiary: c.beneficiaryName,
      status: c.status,
      emergency: c.emergency,
      applicant: memMap.get(c.applicantId) ?? { nameEn: 'Member', color: '#475569' },
    })),
    ...recentLoans.map((l) => ({
      kind: 'loan' as const,
      id: l.id,
      ts: new Date(l.issuedOn).getTime(),
      amount: l.amount,
      paid: l.paid,
      purpose: l.purpose,
      member: memMap.get(l.memberId) ?? { nameEn: 'Member', color: '#475569' },
    })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 10);

  if (feed.length === 0) {
    return <div className="py-10 text-center text-sm italic text-[var(--txt-3)]">No community activity yet</div>;
  }

  return (
    <>
      {feed.map((item) => {
        if (item.kind === 'payment') {
          return (
            <div key={`p-${item.id}`} className="flex items-center gap-3 border-b border-[rgba(214,210,199,0.06)] px-3 py-2.5">
              <div className="grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: item.actor.color }}>
                {item.anon ? '·' : ini(item.actor.nameEn || (item.actor.nameUr ?? '?'))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[var(--color-cream)]">
                  {item.anon ? '🤲 ' : '💰 '}{item.actor.nameEn} donated <span className="capitalize">{item.pool}</span>
                </div>
                <div className="text-[10px] text-[var(--color-gold-4)]">{item.monthLabel}</div>
              </div>
              <div className="shrink-0 font-bold text-[var(--color-gold)]">{fmtRs(item.amount)}</div>
            </div>
          );
        }
        if (item.kind === 'case') {
          return (
            <div key={`c-${item.id}`} className="flex items-center gap-3 border-b border-[rgba(214,210,199,0.06)] px-3 py-2.5">
              <div className="grid size-7 shrink-0 place-items-center rounded-full bg-red-500/15 text-xs text-red-400">{item.emergency ? '🚨' : '🆘'}</div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm text-[var(--color-cream)]">{item.beneficiary} · {item.category}</div>
                <div className="text-[10px] text-[var(--color-gold-4)]">by {item.applicant.nameEn} · {item.status}</div>
              </div>
              <div className="shrink-0 font-bold text-[var(--color-gold)]">{fmtRs(item.amount)}</div>
            </div>
          );
        }
        return (
          <div key={`l-${item.id}`} className="flex items-center gap-3 border-b border-[rgba(214,210,199,0.06)] px-3 py-2.5">
            <div className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-500/15 text-xs text-blue-400">📤</div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm text-[var(--color-cream)]">{item.member.nameEn} · {item.purpose}</div>
              <div className="text-[10px] text-[var(--color-gold-4)]">Paid {fmtRs(item.paid)} of {fmtRs(item.amount)}</div>
            </div>
            <div className="shrink-0 font-bold text-[var(--color-gold)]">{fmtRs(item.amount - item.paid)} left</div>
          </div>
        );
      })}
    </>
  );
}

async function MemberRecentActivity({ memberId }: { memberId: string }) {
  const myPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.memberId, memberId))
    .orderBy(desc(payments.createdAt))
    .limit(5);

  if (myPayments.length === 0) {
    return <div className="py-10 text-center text-sm italic text-[var(--txt-3)]">No contributions yet — submit your first donation</div>;
  }
  return (
    <>
      {myPayments.map((p) => (
        <div key={p.id} className="flex items-center justify-between border-b border-[rgba(214,210,199,0.06)] px-3 py-2.5">
          <div>
            <div className="text-sm text-[var(--color-cream)]">{p.monthLabel} · <span className="capitalize">{p.pool}</span></div>
            <div className="text-[10px] text-[var(--color-gold-4)]">{new Date(p.paidOn).toLocaleDateString('en-GB')}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-[var(--color-gold)]">{fmtRs(p.amount)}</div>
            {p.pendingVerify
              ? <div className="text-[10px] text-yellow-400">⏳ Pending</div>
              : <div className="text-[10px] text-emerald-400">✓ Verified</div>}
          </div>
        </div>
      ))}
      <div className="border-t border-[rgba(214,210,199,0.06)] px-3 py-2 text-center">
        <Link href="/myaccount" className="text-xs text-[var(--color-gold-4)] hover:text-[var(--color-gold)]">Full history →</Link>
      </div>
    </>
  );
}

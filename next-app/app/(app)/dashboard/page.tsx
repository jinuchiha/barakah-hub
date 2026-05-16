import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import Link from 'next/link';
import {
  Wallet, Users, FileText, Vote, PieChart as PieIcon, Target,
  HandCoins, AlertTriangle, ArrowDownToLine, LogIn, LogOut, UserPlus, CheckCircle2, Mail,
  Activity,
} from 'lucide-react';
import { getMeOrRedirectSupervisor } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments, cases, votes, loans, config as configTbl, auditLog } from '@/lib/db/schema';
import { StatCard } from '@/components/stat-card';
import { GoalBar } from '@/components/goal-bar';
import { SpendingDonut, type DonutSlice } from '@/components/spending-donut';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { fmtRs } from '@/lib/i18n/dict';
import { ini } from '@/lib/utils';

export default async function DashboardPage() {
  const me = await getMeOrRedirectSupervisor();
  const isAdmin = me.role === 'admin';

  const [totalRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount}),0)::int` })
    .from(payments)
    .where(eq(payments.pendingVerify, false));
  const totalFund = Number(totalRow?.total ?? 0);

  const [memberCount] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(members)
    .where(and(eq(members.deceased, false), eq(members.status, 'approved')));

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

  const poolBreakdown = isAdmin
    ? await db
        .select({ pool: payments.pool, total: sql<number>`SUM(${payments.amount})::int` })
        .from(payments)
        .where(eq(payments.pendingVerify, false))
        .groupBy(payments.pool)
    : [];
  const POOL_META: Record<string, { label: string; color: string }> = {
    sadaqah: { label: 'Sadaqah',  color: '#c89b3c' },
    zakat:   { label: 'Zakat',    color: '#2d8a5f' },
    qarz:    { label: 'Qarz pool', color: '#8b6ec9' },
  };
  const poolSlices: DonutSlice[] = poolBreakdown.map((p) => ({
    key: p.pool,
    label: POOL_META[p.pool]?.label ?? p.pool,
    value: Number(p.total),
    color: POOL_META[p.pool]?.color ?? '#7d7768',
  }));

  const caseBreakdown = isAdmin
    ? await db
        .select({ category: cases.category, total: sql<number>`SUM(${cases.amount})::int` })
        .from(cases)
        .where(eq(cases.status, 'disbursed'))
        .groupBy(cases.category)
    : [];
  const CATEGORY_PALETTE = ['#c89b3c', '#2d8a5f', '#8b6ec9', '#b9556a', '#608dd7', '#4ab8d6', '#7d7768'];
  const caseSlices: DonutSlice[] = caseBreakdown.map((c, i) => ({
    key: c.category,
    label: c.category,
    value: Number(c.total),
    color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
  }));

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] pb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[2px] text-[var(--txt-3)]">
            {isAdmin ? 'Administrator' : 'Member'} · Dashboard
          </div>
          <h1 className="mt-1.5 text-[26px] font-semibold leading-tight text-[var(--color-cream)]">
            Welcome back, {me.nameEn || me.nameUr}
          </h1>
          <p className="font-[var(--font-arabic)] mt-1 text-[15px] text-[var(--color-gold-2)]">
            خوش آمدید
          </p>
        </div>
        <div className="text-right text-[11px] text-[var(--txt-3)]">
          <div className="tabular">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      </header>

      <GoalBar config={cfg} totalFund={totalFund} daysRemaining={daysRemaining} />

      <div className="mb-6 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {isAdmin ? (
          <>
            <StatCard label="Total Fund"         icon={<Wallet />}    value={fmtRs(totalFund)}                                       hint={`${memberCount.c} members`} tone="emerald" spark={sparkValues} />
            <StatCard label="Active Members"     icon={<Users />}     value={memberCount.c}                                          hint="Approved family" tone="gold" />
            <StatCard label="Outstanding Loans"  icon={<FileText />}  value={fmtRs(Number(outstandingLoans[0]?.owed ?? 0))}          hint="Active qarz" tone="ruby" />
            <StatCard label="Pending Votes"      icon={<Vote />}      value={pendingVotes}                                           hint={pendingVotes ? 'Needs review' : 'All resolved'} tone="sapphire" />
          </>
        ) : (
          <MemberStats memberId={me.id} totalFund={totalFund} />
        )}
      </div>

      {isAdmin && (poolSlices.length > 0 || caseSlices.length > 0) && (
        <div className="mb-6 grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <PieIcon className="size-4 text-[var(--color-gold)]" />
                <CardTitle>Fund Composition</CardTitle>
              </div>
              <span className="text-[10px] uppercase tracking-[1.5px] text-[var(--txt-3)]">By pool</span>
            </CardHeader>
            <CardBody>
              <SpendingDonut title="Fund composition" slices={poolSlices} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Target className="size-4 text-[var(--color-gold)]" />
                <CardTitle>Disbursements</CardTitle>
              </div>
              <span className="text-[10px] uppercase tracking-[1.5px] text-[var(--txt-3)]">Approved cases</span>
            </CardHeader>
            <CardBody>
              <SpendingDonut title="Disbursements by category" slices={caseSlices} />
            </CardBody>
          </Card>
        </div>
      )}

      {!isAdmin && (
        <Card className="mb-6">
          <CardBody className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-[rgba(45,138,95,0.10)] text-[#4ec38d]">
              <HandCoins className="size-4" />
            </div>
            <div>
              <div className="font-[var(--font-arabic)] text-[13px] text-[var(--color-cream)]">
                خاندانی سرگرمی — سدقہ گمنام
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--txt-2)]">
                Total family contributions are visible. Individual donor names and amounts remain private — true spirit of sadqa.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Activity className="size-4 text-[var(--color-gold)]" />
              <CardTitle>{isAdmin ? 'Recent Activity' : 'My Recent Activity'}</CardTitle>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {isAdmin
              ? <AdminRecentActivity />
              : <MemberRecentActivity memberId={me.id} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Users className="size-4 text-[var(--color-gold)]" />
              <CardTitle>Community Activity</CardTitle>
            </div>
            <span className="text-[10px] uppercase tracking-[1.5px] text-[var(--txt-3)]">Anonymized</span>
          </CardHeader>
          <CardBody className="p-0">
            <CommunityActivity meId={me.id} isAdmin={isAdmin} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="size-4 text-[#f08585]" />
              <CardTitle>Active Emergency Votes</CardTitle>
            </div>
            {pendingVotes > 0 && (
              <Link href="/cases" className="text-[11px] font-medium text-[var(--color-gold)] hover:underline">
                View all →
              </Link>
            )}
          </CardHeader>
          <CardBody className="p-0">
            {openCases.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <CheckCircle2 className="size-5 text-[#4ec38d] opacity-50" />
                <div className="text-[12.5px] text-[var(--txt-3)]">No open votes right now</div>
                <div className="font-[var(--font-arabic)] text-[11px] text-[var(--color-gold-4)]">الحمدللہ</div>
              </div>
            ) : (
              openCases.map((c) => {
                const yes = openVotes.filter((v) => v.caseId === c.id && v.vote).length;
                const pct = eligibleCount > 0 ? Math.round((yes / eligibleCount) * 100) : 0;
                return (
                  <div key={c.id} className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3 last:border-b-0 hover:bg-[var(--surf-3)]">
                    <div className="grid size-8 shrink-0 place-items-center rounded-md bg-[rgba(220,82,82,0.10)] text-[#f08585]">
                      <AlertTriangle className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-[var(--color-cream)]">{c.beneficiaryName}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--txt-3)]">
                        <span className="capitalize">{c.category}</span> · <span className="num">{fmtRs(c.amount)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)]">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#2d8a5f] to-[var(--color-gold)] transition-[width]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="tabular shrink-0 text-[10.5px] text-[var(--txt-3)]">
                          <span className="font-semibold text-[var(--color-cream)]">{yes}</span>/{need}
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/cases"
                      className="shrink-0 rounded-md border border-[var(--border-accent)] bg-[rgba(200,155,60,0.08)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-gold)] transition-colors hover:bg-[rgba(200,155,60,0.15)]"
                    >
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

  const pct = Math.round((months.length / monthsThisYearSoFar) * 100);

  return (
    <>
      <StatCard label="My Total Paid"   icon={<HandCoins />}    value={fmtRs(my)}                                       hint="جزاک اللہ خیر" tone="emerald" />
      <StatCard label="My Months Paid"  icon={<CheckCircle2 />} value={`${months.length}/${monthsThisYearSoFar}`}     hint={`${pct}% of year so far`} tone="gold" />
      <StatCard label="Family Fund"     icon={<Wallet />}       value={fmtRs(totalFund)}                                hint="Collective trust" tone="sapphire" />
    </>
  );
}

const AUDIT_META: Record<string, { Icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  login:                 { Icon: LogIn,         tone: 'text-[#92b3df]' },
  logout:                { Icon: LogOut,        tone: 'text-[var(--txt-3)]' },
  'member-approved':     { Icon: CheckCircle2,  tone: 'text-[#4ec38d]' },
  'member-added':        { Icon: UserPlus,      tone: 'text-[#4ec38d]' },
  'payment-record':      { Icon: Wallet,        tone: 'text-[var(--color-gold)]' },
  'payment-verified':    { Icon: CheckCircle2,  tone: 'text-[#4ec38d]' },
  'payment-self-submit': { Icon: HandCoins,     tone: 'text-[var(--color-gold)]' },
  'vote-cast':           { Icon: Vote,          tone: 'text-[#92b3df]' },
  'emergency-create':    { Icon: AlertTriangle, tone: 'text-[#f08585]' },
  'emergency-approved':  { Icon: CheckCircle2,  tone: 'text-[#4ec38d]' },
  'loan-issue':          { Icon: ArrowDownToLine, tone: 'text-[#92b3df]' },
  'loan-repay':          { Icon: ArrowDownToLine, tone: 'text-[#4ec38d]' },
  'message-sent':        { Icon: Mail,          tone: 'text-[var(--txt-2)]' },
};

async function AdminRecentActivity() {
  const entries = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(6);
  const actorIds = [...new Set(entries.map((e) => e.actorId).filter((v): v is string => !!v))];
  const actors = actorIds.length
    ? await db.select({ id: members.id, nameEn: members.nameEn, nameUr: members.nameUr, color: members.color }).from(members).where(inArray(members.id, actorIds))
    : [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  if (entries.length === 0) {
    return <div className="py-10 text-center text-[12.5px] text-[var(--txt-3)]">No activity yet</div>;
  }
  return (
    <>
      {entries.map((e) => {
        const actor = e.actorId ? actorMap.get(e.actorId) : null;
        const meta = AUDIT_META[e.action] ?? { Icon: Activity, tone: 'text-[var(--txt-3)]' };
        const Icon = meta.Icon;
        return (
          <div key={e.id} className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-2.5 last:border-b-0 hover:bg-[var(--surf-3)]">
            <div
              className="grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
              style={{ background: actor?.color || '#475569' }}
            >
              {actor ? ini(actor.nameEn || actor.nameUr) : '·'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-cream)]">
                <Icon className={`size-3.5 ${meta.tone}`} />
                <span className="capitalize">{e.action.replace(/-/g, ' ')}</span>
              </div>
              <div className="text-[10.5px] text-[var(--txt-3)]">{actor?.nameEn || actor?.nameUr || 'system'}</div>
            </div>
            <div className="tabular shrink-0 text-[10.5px] text-[var(--txt-3)]">
              {new Date(e.createdAt).toLocaleDateString('en-GB')}
            </div>
          </div>
        );
      })}
      <div className="px-5 py-2.5 text-center">
        <Link href="/admin/audit" className="text-[11px] font-medium text-[var(--color-gold)] hover:underline">
          Full audit log →
        </Link>
      </div>
    </>
  );
}

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

  /**
   * Donor anonymisation.
   *
   * Donations of ANY pool stay anonymous for non-admin viewers — the
   * point is that only the person who gave (and admins, who verify
   * the receipt) know the donor's identity. Previously only sadaqah
   * and zakat were masked; qarz donations leaked the donor name.
   *
   * The viewer always sees their own activity un-masked so they can
   * recognise their own contributions in the feed.
   */
  function maskedActor(memberId: string, _pool: string) {
    const isSelf = memberId === meId;
    if (isSelf || isAdmin) {
      return memMap.get(memberId) ?? { nameEn: 'Member', color: '#475569' };
    }
    return { nameEn: 'A member', nameUr: 'ایک رکن', color: '#475569' };
  }

  type FeedItem =
    | { kind: 'payment'; id: string; ts: number; pool: string; amount: number; actor: { nameEn: string; nameUr?: string; color: string }; monthLabel: string; anon: boolean }
    | { kind: 'case'; id: string; ts: number; category: string; amount: number; beneficiary: string; status: string; emergency: boolean; applicant: { nameEn: string; color: string } }
    | { kind: 'loan'; id: string; ts: number; amount: number; paid: number; purpose: string; member: { nameEn: string; color: string } };

  const feed: FeedItem[] = [
    ...recentPayments.map((p) => {
      // Anonymous for everyone except the donor themselves and admins.
      const isPrivate = p.memberId !== meId && !isAdmin;
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
    return <div className="py-10 text-center text-[12.5px] text-[var(--txt-3)]">No community activity yet</div>;
  }

  return (
    <>
      {feed.map((item) => {
        if (item.kind === 'payment') {
          // Anonymous: drop avatar identity and donor name entirely. Show
          // only "Anonymous donation" + amount — sadqa given in secret.
          // For self/admin views, item.anon is false and full info shows.
          if (item.anon) {
            return (
              <div key={`p-${item.id}`} className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-2.5 last:border-b-0 hover:bg-[var(--surf-3)]">
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(200,155,60,0.10)] text-[var(--color-gold)]">
                  <HandCoins className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] text-[var(--color-cream)]">Anonymous donation</div>
                  <div className="text-[10.5px] italic text-[var(--txt-4)]">سدقہ — given in secret</div>
                </div>
                <div className="num shrink-0 font-semibold text-[var(--color-cream)]">{fmtRs(item.amount)}</div>
              </div>
            );
          }
          return (
            <div key={`p-${item.id}`} className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-2.5 last:border-b-0 hover:bg-[var(--surf-3)]">
              <div className="grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white" style={{ background: item.actor.color }}>
                {ini(item.actor.nameEn || (item.actor.nameUr ?? '?'))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] text-[var(--color-cream)]">
                  <span className="font-medium">{item.actor.nameEn}</span> donated <span className="capitalize text-[var(--txt-2)]">{item.pool}</span>
                </div>
                <div className="text-[10.5px] text-[var(--txt-3)]">{item.monthLabel}</div>
              </div>
              <div className="num shrink-0 font-semibold text-[var(--color-cream)]">{fmtRs(item.amount)}</div>
            </div>
          );
        }
        if (item.kind === 'case') {
          return (
            <div key={`c-${item.id}`} className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-2.5 last:border-b-0 hover:bg-[var(--surf-3)]">
              <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(220,82,82,0.10)] text-[#f08585]">
                <AlertTriangle className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] text-[var(--color-cream)]">
                  <span className="font-medium">{item.beneficiary}</span> · <span className="capitalize text-[var(--txt-2)]">{item.category}</span>
                </div>
                <div className="text-[10.5px] text-[var(--txt-3)]">
                  by {item.applicant.nameEn} · <span className="capitalize">{item.status}</span>
                </div>
              </div>
              <div className="num shrink-0 font-semibold text-[var(--color-cream)]">{fmtRs(item.amount)}</div>
            </div>
          );
        }
        return (
          <div key={`l-${item.id}`} className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-2.5 last:border-b-0 hover:bg-[var(--surf-3)]">
            <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(96,141,215,0.10)] text-[#92b3df]">
              <ArrowDownToLine className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] text-[var(--color-cream)]">
                <span className="font-medium">{item.member.nameEn}</span> · <span className="text-[var(--txt-2)]">{item.purpose}</span>
              </div>
              <div className="tabular text-[10.5px] text-[var(--txt-3)]">
                Paid {fmtRs(item.paid)} of {fmtRs(item.amount)}
              </div>
            </div>
            <div className="num shrink-0 font-semibold text-[var(--color-cream)]">{fmtRs(item.amount - item.paid)} <span className="text-[10px] font-normal text-[var(--txt-3)]">left</span></div>
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
    return <div className="py-10 text-center text-[12.5px] text-[var(--txt-3)]">No contributions yet — submit your first donation</div>;
  }
  return (
    <>
      {myPayments.map((p) => (
        <div key={p.id} className="flex items-center justify-between border-b border-[var(--border)] px-5 py-2.5 last:border-b-0 hover:bg-[var(--surf-3)]">
          <div>
            <div className="text-[12.5px] text-[var(--color-cream)]">
              <span className="font-medium">{p.monthLabel}</span> · <span className="capitalize text-[var(--txt-2)]">{p.pool}</span>
            </div>
            <div className="tabular text-[10.5px] text-[var(--txt-3)]">{new Date(p.paidOn).toLocaleDateString('en-GB')}</div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="num text-right font-semibold text-[var(--color-cream)]">{fmtRs(p.amount)}</div>
            {p.pendingVerify
              ? <span className="pill pill-warn">Pending</span>
              : <span className="pill pill-success">Verified</span>}
          </div>
        </div>
      ))}
      <div className="px-5 py-2.5 text-center">
        <Link href="/myaccount" className="text-[11px] font-medium text-[var(--color-gold)] hover:underline">
          Full history →
        </Link>
      </div>
    </>
  );
}

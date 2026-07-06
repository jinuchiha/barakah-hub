import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { eq, desc, sql, and, isNull, isNotNull } from 'drizzle-orm';
import { getMeOrRedirect, canManageFunds } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { StatCard } from '@/components/stat-card';
import { Breadcrumb } from '@/components/breadcrumb';
import { fmtRs } from '@/lib/i18n/dict';
import { ini } from '@/lib/utils';
import RecordPaymentForm from './record-payment-form';
import VerifyButtons from './verify-buttons';
import { ExportLink } from '@/components/export-link';
import { MonthlyFundChart, type MonthBucket } from '@/components/monthly-fund-chart';

export const metadata = { title: 'Fund Register · Barakah Hub' };

/**
 * Fund register page.
 *
 * Two role-aware variants live here:
 *  - Admin: full view — pool totals, monthly chart, ALL pending
 *    (awaiting supervisor + awaiting admin final), recent history,
 *    record-payment form.
 *  - Supervisor: stripped-down view — ONLY payments awaiting their
 *    pre-approval. No pool totals, no charts, no history, no record
 *    form. Per user spec "baqi kuch bhe nahi pata chalana chaye".
 *
 * Regular members are redirected to the dashboard.
 */
export default async function FundPage() {
  const me = await getMeOrRedirect();
  if (!canManageFunds(me.role)) redirect('/dashboard');

  const isSupervisor = me.role === 'supervisor';

  // Supervisor: minimal view — only payments pending their approval.
  if (isSupervisor) {
    const [awaitingSupervisor, allMembers] = await Promise.all([
      db.select().from(payments)
        .where(and(
          eq(payments.pendingVerify, true),
          isNull(payments.supervisorApprovedAt),
          isNull(payments.supervisorRejectedAt),
        ))
        .orderBy(desc(payments.createdAt)),
      db.select({ id: members.id, nameEn: members.nameEn, nameUr: members.nameUr, color: members.color })
        .from(members),
    ]);
    const memById = new Map(allMembers.map((m) => [m.id, m]));

    // Total amount awaiting supervisor — helps Noor see workload at a glance.
    const pendingTotal = awaitingSupervisor.reduce((s, p) => s + p.amount, 0);

    return (
      <div className="mx-auto max-w-[1400px]">
        <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Fund Approvals' }]} />
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-[var(--txt-3)]">
              Supervisor · Fund Approvals
            </div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.5px] text-[var(--color-cream)]">
              Pending Payments
            </h1>
            <p className="mt-1.5 text-sm text-[var(--txt-3)]">
              Pre-approve payments before they reach admin final verification.
            </p>
          </div>
          {awaitingSupervisor.length > 0 && (
            <div
              className="rounded-xl border px-5 py-3 text-right"
              style={{ borderColor: 'rgba(200,155,60,0.2)', background: 'rgba(200,155,60,0.06)' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[2px] text-[var(--txt-3)]">Pending amount</div>
              <div className="num-display mt-1 text-2xl text-[var(--color-gold)]">{fmtRs(pendingTotal)}</div>
              <div className="mt-0.5 text-[10px] text-[var(--txt-4)]">{awaitingSupervisor.length} payment{awaitingSupervisor.length !== 1 ? 's' : ''}</div>
            </div>
          )}
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Awaiting Your Approval</CardTitle>
            {awaitingSupervisor.length > 0 && (
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ borderColor: 'rgba(200,155,60,0.3)', background: 'rgba(200,155,60,0.08)', color: '#c89b3c' }}
              >
                {awaitingSupervisor.length} waiting
              </span>
            )}
          </CardHeader>
          <CardBody className="p-0">
            {awaitingSupervisor.length === 0 ? (
              <div className="py-14 text-center">
                <div className="mx-auto mb-2 text-[var(--color-gold)] opacity-30 text-3xl">✓</div>
                <div className="text-sm text-[var(--txt-3)]">All caught up — no pending payments</div>
                <div className="font-[var(--font-arabic)] mt-1 text-xs text-[var(--txt-4)]">الحمدللہ</div>
              </div>
            ) : (
              awaitingSupervisor.map((p) => {
                const m = memById.get(p.memberId);
                return (
                  <div key={p.id} className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3.5 last:border-b-0 hover:bg-[var(--surf-3)] transition-colors">
                    <div className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: m?.color || '#888' }}>
                      {m ? ini(m.nameEn || m.nameUr) : '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[var(--color-cream)]">
                        {m?.nameEn || m?.nameUr || 'Unknown member'}
                      </div>
                      <div className="num mt-0.5 text-[var(--color-gold)]">{fmtRs(p.amount)}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--txt-3)]">
                        {p.monthLabel} · <span className="capitalize">{p.pool}</span>
                        {p.note ? ` · ${p.note}` : ''}
                      </div>
                    </div>
                    <VerifyButtons paymentId={p.id} mode="supervisor-pending" />
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  // Admin: full view.
  const [allMembers, history, awaitingSupervisor, awaitingAdmin, rejectedBySupervisor] = await Promise.all([
    db.select().from(members),
    db.select().from(payments).where(eq(payments.pendingVerify, false)).orderBy(desc(payments.paidOn)).limit(50),
    // Awaiting supervisor: still in their initial queue (not approved, not rejected)
    db.select().from(payments)
      .where(and(
        eq(payments.pendingVerify, true),
        isNull(payments.supervisorApprovedAt),
        isNull(payments.supervisorRejectedAt),
      ))
      .orderBy(desc(payments.createdAt)),
    // Awaiting admin: supervisor has approved, admin needs to verify
    db.select().from(payments)
      .where(and(eq(payments.pendingVerify, true), isNotNull(payments.supervisorApprovedAt)))
      .orderBy(desc(payments.supervisorApprovedAt)),
    // Supervisor rejected — admin must decide: resend or delete
    db.select().from(payments)
      .where(and(eq(payments.pendingVerify, true), isNotNull(payments.supervisorRejectedAt)))
      .orderBy(desc(payments.supervisorRejectedAt)),
  ]);
  const memById = new Map(allMembers.map((m) => [m.id, m]));
  // Exclude supervisor-rejected from the headline total — those amounts are
  // contested and should not inflate the "in approval flow" figure.
  const pendingTotal = [...awaitingSupervisor, ...awaitingAdmin]
    .reduce((s, p) => s + p.amount, 0);

  const pools = await db
    .select({
      pool: payments.pool,
      total: sql<number>`COALESCE(SUM(${payments.amount}),0)::int`,
    })
    .from(payments)
    .where(eq(payments.pendingVerify, false))
    .groupBy(payments.pool);
  const poolTotals = {
    sadaqah: pools.find((p) => p.pool === 'sadaqah')?.total ?? 0,
    zakat: pools.find((p) => p.pool === 'zakat')?.total ?? 0,
    qarz: pools.find((p) => p.pool === 'qarz')?.total ?? 0,
  };

  const monthly = await db
    .select({
      monthStart: payments.monthStart,
      monthLabel: payments.monthLabel,
      pool: payments.pool,
      total: sql<number>`SUM(${payments.amount})::int`,
    })
    .from(payments)
    .where(eq(payments.pendingVerify, false))
    .groupBy(payments.monthStart, payments.monthLabel, payments.pool)
    .orderBy(desc(payments.monthStart));

  const bucketMap = new Map<string, MonthBucket>();
  for (const r of monthly) {
    const key = String(r.monthStart);
    let b = bucketMap.get(key);
    if (!b) {
      b = { monthStart: key, monthLabel: r.monthLabel, sadaqah: 0, zakat: 0, qarz: 0 };
      bucketMap.set(key, b);
    }
    b[r.pool] = Number(r.total);
  }
  const chartBuckets = [...bucketMap.values()].slice(0, 12).reverse();

  return (
    <div className="mx-auto max-w-[1400px]">
      <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin' }, { label: 'Fund Register' }]} />
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-[var(--txt-3)]">
            Admin · Fund Register
          </div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.5px] text-[var(--color-cream)]">
            Family Fund
          </h1>
          <p className="font-[var(--font-arabic)] mt-1 text-sm text-[var(--color-gold-2)]">فنڈ رجسٹر · صدقہ / زکوٰة / قرض</p>
        </div>
        <ExportLink href={'/api/exports/fund' as Route}>Export CSV</ExportLink>
      </header>

      <div className="mb-6 grid gap-3 grid-cols-3">
        <StatCard label="Sadaqah Pool" value={fmtRs(Number(poolTotals.sadaqah))} tone="gold"     hint="Voluntary charity" />
        <StatCard label="Zakat Pool"   value={fmtRs(Number(poolTotals.zakat))}   tone="emerald"  hint="Obligatory alms" />
        <StatCard label="Qarz Pool"    value={fmtRs(Number(poolTotals.qarz))}    tone="sapphire" hint="Interest-free loans" />
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>Monthly Inflow · Last {chartBuckets.length} Months</CardTitle></CardHeader>
        <CardBody>
          <MonthlyFundChart buckets={chartBuckets} />
        </CardBody>
      </Card>

      {(awaitingSupervisor.length + awaitingAdmin.length + rejectedBySupervisor.length) > 0 && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-[var(--border-accent)] bg-[rgba(200,155,60,0.06)] px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[2px] text-[var(--color-gold-4)]">
            Pending in approval flow
          </span>
          <span className="num-display text-xl text-[var(--color-gold)]">{fmtRs(pendingTotal)}</span>
        </div>
      )}

      {awaitingAdmin.length > 0 && (
        <Card className="mb-4 border-[var(--color-gold)]/40 ring-1 ring-[var(--color-gold)]/20">
          <CardHeader>
            <CardTitle>✓ Supervisor-Approved · Awaiting Your Final ({awaitingAdmin.length})</CardTitle>
            <span className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-gold-4)]">
              Verify to release into the fund
            </span>
          </CardHeader>
          <CardBody className="p-0">
            {awaitingAdmin.map((p) => {
              const m = memById.get(p.memberId);
              const supr = p.supervisorApprovedById ? memById.get(p.supervisorApprovedById) : null;
              return (
                <div key={p.id} className="flex items-center gap-3 border-b border-[var(--border)] p-3 last:border-b-0">
                  <div className="grid size-8 place-items-center rounded-full text-xs font-bold text-white" style={{ background: m?.color || '#888' }}>{m ? ini(m.nameEn || m.nameUr) : '?'}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[var(--color-cream)]">
                      {m?.nameEn || m?.nameUr} · <span className="text-[var(--color-gold)]">{fmtRs(p.amount)}</span>
                    </div>
                    <div className="text-[11px] text-[var(--color-gold-4)]">
                      {p.monthLabel} · {p.pool}{p.note ? ` · ${p.note}` : ''}
                    </div>
                    {supr && (
                      <div className="mt-0.5 text-[10px] text-[var(--txt-3)]">
                        Approved by {supr.nameEn || supr.nameUr}
                      </div>
                    )}
                  </div>
                  <VerifyButtons paymentId={p.id} mode="admin-approved" />
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      {rejectedBySupervisor.length > 0 && (
        <Card className="mb-4 border-[#dc5252]/30 ring-1 ring-[#dc5252]/15">
          <CardHeader>
            <CardTitle>✗ Supervisor Rejected · Your Decision ({rejectedBySupervisor.length})</CardTitle>
            <span className="text-[10px] uppercase tracking-[1.5px] text-[#f08585]">
              Resend for re-approval or delete
            </span>
          </CardHeader>
          <CardBody className="p-0">
            {rejectedBySupervisor.map((p) => {
              const m = memById.get(p.memberId);
              const supr = p.supervisorRejectedById ? memById.get(p.supervisorRejectedById) : null;
              const rejectedAt = p.supervisorRejectedAt ? new Date(p.supervisorRejectedAt) : null;
              return (
                <div key={p.id} className="flex items-start gap-3 border-b border-[var(--border)] p-3 last:border-b-0">
                  <div className="mt-0.5 grid size-8 place-items-center rounded-full text-xs font-bold text-white" style={{ background: m?.color || '#888' }}>{m ? ini(m.nameEn || m.nameUr) : '?'}</div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold text-[var(--color-cream)]">
                        {m?.nameEn || m?.nameUr}
                      </span>
                      <span className="num text-[var(--color-gold)]">{fmtRs(p.amount)}</span>
                      <span className="rounded-full bg-[rgba(220,82,82,0.10)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f08585]">
                        Rejected
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--txt-3)]">
                      <span className="capitalize">{p.pool}</span> · {p.monthLabel} · Submitted {new Date(p.createdAt).toLocaleDateString('en-GB')}
                      {p.note ? <> · Member note: <span className="italic">{p.note}</span></> : null}
                    </div>
                    <div className="mt-1.5 text-[10.5px] text-[#f08585]">
                      Rejected by {supr ? (supr.nameEn || supr.nameUr) : 'supervisor'}
                      {rejectedAt && (
                        <> · {rejectedAt.toLocaleDateString('en-GB')} at {rejectedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</>
                      )}
                    </div>
                    {p.supervisorRejectionNote ? (
                      <div className="mt-1.5 rounded border-l-2 border-[#dc5252]/40 bg-[rgba(220,82,82,0.05)] px-2.5 py-1.5 text-[12px] italic text-[var(--txt-2)]">
                        &ldquo;{p.supervisorRejectionNote}&rdquo;
                      </div>
                    ) : (
                      <div className="mt-1.5 text-[10.5px] italic text-[var(--txt-4)]">
                        Supervisor did not leave a reason
                      </div>
                    )}
                  </div>
                  <VerifyButtons paymentId={p.id} mode="admin-rejected" />
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      {awaitingSupervisor.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>⏳ Pending Supervisor ({awaitingSupervisor.length})</CardTitle>
            <span className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-gold-4)]">
              Waiting for supervisor&apos;s first review
            </span>
          </CardHeader>
          <CardBody className="p-0">
            {awaitingSupervisor.map((p) => {
              const m = memById.get(p.memberId);
              return (
                <div key={p.id} className="flex items-center gap-3 border-b border-[var(--border)] p-3 last:border-b-0">
                  <div className="grid size-8 place-items-center rounded-full text-xs font-bold text-white" style={{ background: m?.color || '#888' }}>{m ? ini(m.nameEn || m.nameUr) : '?'}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[var(--color-cream)]">
                      {m?.nameEn || m?.nameUr} · <span className="text-[var(--color-gold)]">{fmtRs(p.amount)}</span>
                    </div>
                    <div className="text-[11px] text-[var(--color-gold-4)]">{p.monthLabel} · {p.pool}{p.note ? ` · ${p.note}` : ''}</div>
                  </div>
                  <VerifyButtons paymentId={p.id} mode="admin-pending" />
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>+ Record Payment</CardTitle></CardHeader>
          <CardBody>
            <RecordPaymentForm members={allMembers.filter((m) => !m.deceased && m.status === 'approved').map((m) => ({ id: m.id, nameEn: m.nameEn || m.nameUr || m.username }))} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent History</CardTitle></CardHeader>
          <CardBody className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <div className="py-10 text-center text-sm italic text-[var(--txt-3)]">No payments yet</div>
              ) : history.map((p) => {
                const m = memById.get(p.memberId);
                return (
                  <div key={p.id} className="flex items-center gap-2 border-b border-[rgba(214,210,199,0.06)] px-3 py-2.5">
                    <div className="grid size-7 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: m?.color || '#888' }}>{m ? ini(m.nameEn || m.nameUr) : '?'}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[var(--color-cream)]">{m?.nameEn || m?.nameUr} <span className="font-bold text-[var(--color-gold)]">{fmtRs(p.amount)}</span></div>
                      <div className="text-[10px] text-[var(--color-gold-4)]">{p.monthLabel} · {p.pool} · {new Date(p.paidOn).toLocaleDateString('en-GB')}</div>
                    </div>
                    {/* History rows are already verified — show delete-only mode, not the full verify/reject UI */}
                    <VerifyButtons paymentId={p.id} mode="admin-history" />
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

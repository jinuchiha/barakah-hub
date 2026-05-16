import { redirect } from 'next/navigation';
import { eq, desc, sql, and, isNull, isNotNull, or } from 'drizzle-orm';
import { getMeOrRedirect, canManageFunds } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
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
      <div>
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-cream)]">Pending Payments</h1>
            <p className="mt-1 text-sm text-[var(--txt-3)]">
              Review and approve incoming payments. An admin will give the final verification afterwards.
            </p>
          </div>
          {awaitingSupervisor.length > 0 && (
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--txt-3)]">Pending amount</div>
              <div className="num-display mt-1 text-2xl text-[var(--color-gold)]">{fmtRs(pendingTotal)}</div>
            </div>
          )}
        </header>

        <Card>
          <CardHeader>
            <CardTitle>⏳ Awaiting Your Approval ({awaitingSupervisor.length})</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {awaitingSupervisor.length === 0 ? (
              <div className="py-12 text-center text-sm italic text-[var(--txt-3)]">
                Sab kuch verify ho gaya — koi pending nahi
              </div>
            ) : (
              awaitingSupervisor.map((p) => {
                const m = memById.get(p.memberId);
                return (
                  <div key={p.id} className="flex items-center gap-3 border-b border-[var(--border)] p-3 last:border-b-0">
                    <div className="grid size-9 place-items-center rounded-full text-xs font-bold text-white" style={{ background: m?.color || '#888' }}>
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
    db.select().from(members).where(and(eq(members.deceased, false), eq(members.status, 'approved'))),
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
  const pendingTotal = [...awaitingSupervisor, ...awaitingAdmin, ...rejectedBySupervisor]
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
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">فنڈ رجسٹر</h1>
          <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Multi-pool ledger · sadaqah / zakat / qarz</p>
        </div>
        <ExportLink href={'/api/exports/fund' as any}>Export CSV</ExportLink>
      </header>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card><CardBody><div className="text-xs text-[var(--color-gold-4)]">Sadaqah Pool</div><div className="font-[var(--font-display)] text-2xl text-[var(--color-emerald-2)]">{fmtRs(Number(poolTotals.sadaqah))}</div></CardBody></Card>
        <Card><CardBody><div className="text-xs text-[var(--color-gold-4)]">Zakat Pool</div><div className="font-[var(--font-display)] text-2xl text-[var(--color-gold)]">{fmtRs(Number(poolTotals.zakat))}</div></CardBody></Card>
        <Card><CardBody><div className="text-xs text-[var(--color-gold-4)]">Qarz Pool</div><div className="font-[var(--font-display)] text-2xl text-blue-400">{fmtRs(Number(poolTotals.qarz))}</div></CardBody></Card>
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
              return (
                <div key={p.id} className="flex items-start gap-3 border-b border-[var(--border)] p-3 last:border-b-0">
                  <div className="mt-0.5 grid size-8 place-items-center rounded-full text-xs font-bold text-white" style={{ background: m?.color || '#888' }}>{m ? ini(m.nameEn || m.nameUr) : '?'}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[var(--color-cream)]">
                      {m?.nameEn || m?.nameUr} · <span className="text-[var(--color-gold)]">{fmtRs(p.amount)}</span>
                    </div>
                    <div className="text-[11px] text-[var(--color-gold-4)]">
                      {p.monthLabel} · {p.pool}{p.note ? ` · ${p.note}` : ''}
                    </div>
                    {supr && (
                      <div className="mt-0.5 text-[10px] text-[#f08585]">
                        Rejected by {supr.nameEn || supr.nameUr}
                      </div>
                    )}
                    {p.supervisorRejectionNote && (
                      <div className="mt-1 rounded border-l-2 border-[#dc5252]/40 bg-[rgba(220,82,82,0.05)] px-2 py-1 text-[11px] italic text-[var(--txt-2)]">
                        "{p.supervisorRejectionNote}"
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
              Waiting for supervisor's first review
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
            <RecordPaymentForm members={allMembers.map((m) => ({ id: m.id, nameEn: m.nameEn || m.nameUr || m.username }))} />
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
                    {/* Admin can delete verified payments too — useful for fixing recording mistakes */}
                    <VerifyButtons paymentId={p.id} mode="admin-pending" />
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

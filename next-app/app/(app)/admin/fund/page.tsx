import { redirect } from 'next/navigation';
import { eq, desc, sql } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { fmtRs } from '@/lib/i18n/dict';
import { ini } from '@/lib/utils';
import RecordPaymentForm from './record-payment-form';
import VerifyButtons from './verify-buttons';

export const metadata = { title: 'Fund Register · Barakah Hub' };

export default async function FundPage() {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') redirect('/dashboard');

  const [allMembers, history, pending] = await Promise.all([
    db.select().from(members).where(eq(members.deceased, false)),
    db.select().from(payments).where(eq(payments.pendingVerify, false)).orderBy(desc(payments.paidOn)).limit(50),
    db.select().from(payments).where(eq(payments.pendingVerify, true)).orderBy(desc(payments.createdAt)),
  ]);
  const memById = new Map(allMembers.map((m) => [m.id, m]));

  // Pool totals
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

  return (
    <div>
      <header className="mb-6 border-b border-[var(--border)] pb-4">
        <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">فنڈ رجسٹر</h1>
        <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Multi-pool ledger · sadaqah / zakat / qarz</p>
      </header>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card><CardBody><div className="text-xs text-[var(--color-gold-4)]">Sadaqah Pool</div><div className="font-[var(--font-display)] text-2xl text-[var(--color-emerald-2)]">{fmtRs(Number(poolTotals.sadaqah))}</div></CardBody></Card>
        <Card><CardBody><div className="text-xs text-[var(--color-gold-4)]">Zakat Pool</div><div className="font-[var(--font-display)] text-2xl text-[var(--color-gold)]">{fmtRs(Number(poolTotals.zakat))}</div></CardBody></Card>
        <Card><CardBody><div className="text-xs text-[var(--color-gold-4)]">Qarz Pool</div><div className="font-[var(--font-display)] text-2xl text-blue-400">{fmtRs(Number(poolTotals.qarz))}</div></CardBody></Card>
      </div>

      {pending.length > 0 && (
        <Card className="mb-4 border-[var(--color-gold)]/40 ring-1 ring-[var(--color-gold)]/20">
          <CardHeader><CardTitle>⏳ Pending Verifications ({pending.length})</CardTitle></CardHeader>
          <CardBody className="p-0">
            {pending.map((p) => {
              const m = memById.get(p.memberId);
              return (
                <div key={p.id} className="flex items-center gap-3 border-b border-[var(--border)] p-3">
                  <div className="grid size-8 place-items-center rounded-full text-xs font-bold text-white" style={{ background: m?.color || '#888' }}>{m ? ini(m.nameEn || m.nameUr) : '?'}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[var(--color-cream)]">
                      {m?.nameEn || m?.nameUr} · <span className="text-[var(--color-gold)]">{fmtRs(p.amount)}</span>
                    </div>
                    <div className="text-[11px] text-[var(--color-gold-4)]">{p.monthLabel} · {p.pool}{p.note ? ` · ${p.note}` : ''}</div>
                  </div>
                  <VerifyButtons paymentId={p.id} />
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
                  <div key={p.id} className="flex items-center gap-3 border-b border-[rgba(201,168,76,0.06)] px-3 py-2.5">
                    <div className="grid size-7 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: m?.color || '#888' }}>{m ? ini(m.nameEn || m.nameUr) : '?'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--color-cream)]">{m?.nameEn || m?.nameUr} <span className="font-bold text-[var(--color-gold)]">{fmtRs(p.amount)}</span></div>
                      <div className="text-[10px] text-[var(--color-gold-4)]">{p.monthLabel} · {p.pool} · {new Date(p.paidOn).toLocaleDateString('en-GB')}</div>
                    </div>
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

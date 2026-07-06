import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { eq, desc, asc } from 'drizzle-orm';
import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, loans } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { StatCard } from '@/components/stat-card';
import { Breadcrumb } from '@/components/breadcrumb';
import { fmtRs } from '@/lib/i18n/dict';
import IssueLoanForm from './issue-loan-form';
import RepayForm from './repay-form';
import { ExportLink } from '@/components/export-link';

export const metadata = { title: 'Qarz-e-Hasana · Barakah Hub' };

export default async function LoansPage() {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') redirect('/dashboard');

  const [all, allMembers] = await Promise.all([
    db.select().from(loans).orderBy(desc(loans.issuedOn)),
    db.select().from(members).where(eq(members.deceased, false)).orderBy(asc(members.nameEn)),
  ]);
  const memById = new Map(allMembers.map((m) => [m.id, m]));

  const active = all.filter((l) => l.active);
  const repaid = all.filter((l) => !l.active);
  const outstanding = active.reduce((a, l) => a + (l.amount - l.paid), 0);

  const memberOptions = allMembers
    .filter((m) => m.status === 'approved')
    .map((m) => ({ id: m.id, name: m.nameEn || m.nameUr || m.username }));

  return (
    <div className="mx-auto max-w-[1400px]">
      <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin' }, { label: 'Qarz-e-Hasana' }]} />
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-[var(--txt-3)]">Admin · Loans</div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.5px] text-[var(--color-cream)]">Qarz-e-Hasana</h1>
          <p className="font-[var(--font-arabic)] mt-1 text-sm text-[var(--color-gold-2)]">قرض حسنہ · Interest-free loans</p>
        </div>
        <ExportLink href={'/api/exports/loans' as Route}>Export CSV</ExportLink>
      </header>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Active Loans"    value={active.length}      icon={<FileText />}    tone="sapphire" hint={`${fmtRs(outstanding)} outstanding`} />
        <StatCard label="Fully Repaid"    value={repaid.length}      icon={<CheckCircle2 />} tone="emerald"  hint="Completed" />
        <StatCard label="Total Disbursed" value={fmtRs(all.reduce((s,l) => s + l.amount, 0))} icon={<AlertCircle />} tone="gold" hint="All time" />
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>Issue New Loan</CardTitle></CardHeader>
        <CardBody>
          <IssueLoanForm members={memberOptions} />
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Active Qarz</CardTitle></CardHeader>
        <CardBody className="p-0">
          {active.length === 0 && (
            <div className="py-12 text-center text-sm italic text-[var(--txt-3)]">No active qarz · No outstanding loans</div>
          )}
          {active.map((l) => {
            const m = memById.get(l.memberId);
            const remaining = l.amount - l.paid;
            const pct = l.amount > 0 ? Math.round((l.paid / l.amount) * 100) : 0;
            return (
              <div key={l.id} className="border-b border-[rgba(214,210,199,0.06)] p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-cream)]">{m?.nameEn || m?.nameUr}</div>
                    <div className="mt-0.5 text-xs text-[var(--txt-3)]">{l.purpose}</div>
                    <div className="mt-1 text-[10px] text-[var(--color-gold-4)]">
                      Issued {new Date(l.issuedOn).toLocaleDateString('en-GB')}
                      {l.expectedReturn && ` · Return by ${new Date(l.expectedReturn).toLocaleDateString('en-GB')}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-[var(--font-display)] text-lg text-[var(--color-gold)]">{fmtRs(remaining)}</div>
                    <div className="text-[10px] text-[var(--color-gold-4)]">remaining</div>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/20">
                  <div className="h-full bg-gradient-to-r from-[var(--color-emerald-2)] to-[var(--color-gold)]" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 font-[var(--font-en)] text-[10px] text-[var(--color-gold-4)]">
                  {fmtRs(l.paid)} repaid of {fmtRs(l.amount)} ({pct}%)
                </div>
                <RepayForm loanId={l.id} remaining={remaining} />
              </div>
            );
          })}
        </CardBody>
      </Card>

      {repaid.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Fully Repaid ({repaid.length})</CardTitle></CardHeader>
          <CardBody className="p-0">
            {repaid.map((l) => {
              const m = memById.get(l.memberId);
              return (
                <div key={l.id} className="flex items-center justify-between border-b border-[rgba(214,210,199,0.06)] px-4 py-2.5">
                  <span className="text-sm text-[var(--txt-2)]">{m?.nameEn || m?.nameUr} · {l.purpose}</span>
                  <span className="font-[var(--font-display)] text-sm text-[var(--color-emerald-2)]">{fmtRs(l.amount)} ✓</span>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

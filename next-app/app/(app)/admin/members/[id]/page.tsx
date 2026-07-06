import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { Wallet, Clock, CalendarCheck, HandCoins, Phone, MapPin, UserRound } from 'lucide-react';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments, loans, repayments, auditLog, cases, config as configTbl } from '@/lib/db/schema';
import { planStatus } from '@/lib/loan-math';
import FautiButton from './fauti-button';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { StatCard } from '@/components/stat-card';
import { Breadcrumb } from '@/components/breadcrumb';
import { fmtRs } from '@/lib/i18n/dict';
import { ini } from '@/lib/utils';

export const metadata = { title: 'Member Profile · Barakah Hub' };

const dateFmt = (d: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') redirect('/dashboard');
  const { id } = await params;

  const [m] = await db.select().from(members).where(eq(members.id, id)).limit(1);
  if (!m) notFound();

  const [memberPayments, memberLoans, activity] = await Promise.all([
    db.select().from(payments).where(eq(payments.memberId, id)).orderBy(desc(payments.paidOn)),
    db.select().from(loans).where(eq(loans.memberId, id)).orderBy(desc(loans.issuedOn)),
    db.select().from(auditLog).where(eq(auditLog.targetId, id)).orderBy(desc(auditLog.createdAt)).limit(12),
  ]);
  const memberRepayments = memberLoans.length
    ? await db.select().from(repayments).where(inArray(repayments.loanId, memberLoans.map((l) => l.id)))
    : [];
  // Fauti workflow context — only queried for deceased members.
  const [fautiCase] = m.deceased
    ? await db.select().from(cases).where(and(eq(cases.applicantId, id), eq(cases.category, 'fauti'))).limit(1)
    : [];
  const [cfg] = m.deceased
    ? await db.select({ fautiAmount: configTbl.fautiAmount }).from(configTbl).where(eq(configTbl.id, 1)).limit(1)
    : [];
  const repaysByLoan = new Map<string, typeof memberRepayments>();
  for (const r of memberRepayments) {
    repaysByLoan.set(r.loanId, [...(repaysByLoan.get(r.loanId) ?? []), r]);
  }

  const verified = memberPayments.filter((p) => !p.pendingVerify);
  const verifiedTotal = verified.reduce((s, p) => s + p.amount, 0);
  const pendingTotal = memberPayments.filter((p) => p.pendingVerify && !p.supervisorRejectedAt).reduce((s, p) => s + p.amount, 0);
  const monthsPaid = new Set(verified.map((p) => p.monthLabel)).size;
  const outstanding = memberLoans.filter((l) => l.active).reduce((s, l) => s + (l.amount - l.paid), 0);
  const name = m.nameEn || m.nameUr;

  return (
    <div className="mx-auto max-w-[1200px]">
      <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Members', href: '/admin/members' }, { label: name }]} />

      {/* ── Identity header ── */}
      <header className="mb-8 flex flex-wrap items-center gap-5 border-b border-[var(--border)] pb-6">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full text-2xl font-bold text-white shadow-[0_0_0_4px_rgba(200,155,60,0.15)]" style={{ background: m.color }}>
          {m.photoUrl ? <img src={m.photoUrl} alt="" className="size-full rounded-full object-cover" /> : ini(name)}
        </div>
        <div className="min-w-0 flex-1">
          {m.nameUr && <div className="font-[var(--font-arabic)] text-2xl leading-[1.9] text-[var(--color-gold-2)]">{m.nameUr}</div>}
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.5px] text-[var(--color-cream)]">{m.nameEn}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--txt-3)]">
            {m.fatherName && m.fatherName !== '—' && <span className="inline-flex items-center gap-1"><UserRound className="size-3" aria-hidden /> s/o {m.fatherName}</span>}
            {m.city && <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden /> {m.city}{m.province ? `, ${m.province}` : ''}</span>}
            {m.phone && <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 hover:text-[var(--color-gold-2)]"><Phone className="size-3" aria-hidden /> {m.phone}</a>}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${m.deceased ? 'bg-[rgba(214,210,199,0.1)] text-[var(--txt-3)]' : m.status === 'approved' ? 'bg-[rgba(45,138,95,0.12)] text-[#4ec38d]' : 'bg-[rgba(200,155,60,0.12)] text-[var(--color-gold-2)]'}`}>
          {m.deceased ? 'مرحوم · Deceased' : m.role === 'admin' ? 'Admin' : m.role === 'supervisor' ? 'Supervisor' : m.status}
        </span>
      </header>

      {/* ── Fauti workflow (deceased members only) ── */}
      {m.deceased && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(200,155,60,0.3)] bg-[rgba(200,155,60,0.06)] px-5 py-4">
          <div>
            <div className="font-[var(--font-arabic)] text-base leading-[1.9] text-[var(--color-gold-2)]">فوتی فنڈ</div>
            <div className="text-xs text-[var(--txt-3)]">
              {fautiCase
                ? `Fauti case ${fautiCase.status} · ${fmtRs(fautiCase.amount)} for ${fautiCase.beneficiaryName}`
                : (cfg?.fautiAmount ?? 0) > 0
                  ? `Family payout of ${fmtRs(cfg?.fautiAmount ?? 0)} can be opened for the family`
                  : 'Set the fauti amount in Settings to enable the payout workflow'}
            </div>
          </div>
          {!fautiCase && (cfg?.fautiAmount ?? 0) > 0 && <FautiButton memberId={m.id} />}
          {fautiCase && fautiCase.status === 'approved' && (
            <Link href="/cases" className="text-[11px] font-semibold text-[var(--color-gold-2)] hover:underline">
              Disburse from Cases →
            </Link>
          )}
        </div>
      )}

      {/* ── Money at a glance ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Verified Total" value={fmtRs(verifiedTotal)} icon={<Wallet />} tone="gold" hint={`${verified.length} payments`} />
        <StatCard label="In Approval" value={fmtRs(pendingTotal)} icon={<Clock />} tone="sapphire" hint="Awaiting verification" />
        <StatCard label="Months Contributed" value={monthsPaid} icon={<CalendarCheck />} tone="emerald" hint={`Pledge ${fmtRs(m.monthlyPledge)}/mo`} />
        <StatCard label="Loan Outstanding" value={fmtRs(outstanding)} icon={<HandCoins />} tone={outstanding > 0 ? 'ruby' : 'ocean'} hint={`${memberLoans.length} loan(s) total`} />
      </div>

      {/* ── Full payment history ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment History · مکمل ریکارڈ</CardTitle>
          <span className="text-[11px] text-[var(--color-gold-4)]">{memberPayments.length} entries</span>
        </CardHeader>
        <CardBody className="p-0">
          {memberPayments.length === 0 ? (
            <div className="p-10 text-center text-sm italic text-[var(--txt-3)]">No payments recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[rgba(214,210,199,0.04)] text-left text-[10px] font-bold uppercase tracking-[1.5px] text-[var(--txt-4)]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Pool</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {memberPayments.map((p) => (
                    <tr key={p.id} className="table-row-hover border-b border-[rgba(214,210,199,0.06)]">
                      <td className="px-4 py-2.5 text-xs text-[var(--txt-2)]">{dateFmt(p.paidOn)}</td>
                      <td className="px-4 py-2.5 text-xs text-[var(--txt-2)]">{p.monthLabel}</td>
                      <td className="px-4 py-2.5 text-xs capitalize text-[var(--txt-3)]">{p.pool}</td>
                      <td className="px-4 py-2.5 text-right font-[var(--font-display)] text-[var(--color-gold)]">{fmtRs(p.amount)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${!p.pendingVerify ? 'bg-[rgba(45,138,95,0.12)] text-[#4ec38d]' : p.supervisorRejectedAt ? 'bg-[rgba(220,82,82,0.12)] text-[#f08585]' : 'bg-[rgba(200,155,60,0.12)] text-[var(--color-gold-2)]'}`}>
                          {!p.pendingVerify ? 'Verified' : p.supervisorRejectedAt ? 'Rejected' : 'Pending'}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-xs text-[var(--txt-4)]">{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Loans + repayments ── */}
        <Card>
          <CardHeader><CardTitle>Qarz-e-Hasana · قرض حسنہ</CardTitle></CardHeader>
          <CardBody>
            {memberLoans.length === 0 ? (
              <div className="py-6 text-center text-sm italic text-[var(--txt-3)]">No loans taken.</div>
            ) : (
              <div className="space-y-4">
                {memberLoans.map((l) => (
                  <div key={l.id} className="rounded-xl border border-[var(--border)] p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--color-cream)]">{l.purpose}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${l.active ? 'bg-[rgba(200,155,60,0.12)] text-[var(--color-gold-2)]' : 'bg-[rgba(45,138,95,0.12)] text-[#4ec38d]'}`}>
                        {l.active ? 'Active' : 'Settled'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--txt-3)]">
                      Issued {dateFmt(l.issuedOn)} · {fmtRs(l.paid)} repaid of {fmtRs(l.amount)}
                    </div>
                    {(() => {
                      const ps = planStatus(l, new Date());
                      if (!ps.hasPlan || !l.active) return null;
                      return (
                        <div className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ps.onTrack ? 'border-[rgba(45,138,95,0.4)] text-[#4ec38d]' : 'border-[rgba(220,82,82,0.4)] text-[#f08585]'}`}>
                          {ps.onTrack
                            ? `On plan · ${fmtRs(l.installmentAmount ?? 0)}/month`
                            : `Behind by ${fmtRs(ps.shortfall)} · plan ${fmtRs(l.installmentAmount ?? 0)}/month`}
                        </div>
                      );
                    })()}
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surf-3)]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold-4)] to-[var(--color-gold)]" style={{ width: `${Math.min(100, Math.round((l.paid / l.amount) * 100))}%` }} />
                    </div>
                    {(repaysByLoan.get(l.id) ?? []).length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-[var(--border)] pt-2 text-xs text-[var(--txt-3)]">
                        {(repaysByLoan.get(l.id) ?? []).map((r) => (
                          <li key={r.id} className="flex justify-between">
                            <span>{dateFmt(r.paidOn)}</span>
                            <span className="font-[var(--font-display)] text-[var(--color-gold)]">{fmtRs(r.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Recent activity ── */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <Link href="/admin/audit" className="text-[11px] text-[var(--color-gold-4)] hover:text-[var(--color-gold-2)]">Full audit log →</Link>
          </CardHeader>
          <CardBody>
            {activity.length === 0 ? (
              <div className="py-6 text-center text-sm italic text-[var(--txt-3)]">No activity recorded for this member.</div>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-3 text-xs">
                    <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--color-gold-4)]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-[var(--txt-2)]">{a.detail || a.action}</div>
                      <div className="mt-0.5 text-[10px] text-[var(--txt-4)]">{a.createdAt ? new Date(a.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

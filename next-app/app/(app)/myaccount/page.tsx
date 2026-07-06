import { eq, desc, and } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { payments, loans, config as configTbl } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Breadcrumb } from '@/components/breadcrumb';
import { fmtRs } from '@/lib/i18n/dict';
import { ini } from '@/lib/utils';
import DonationForm from './donation-form';

export default async function MyAccountPage() {
  const me = await getMeOrRedirect();

  const [myPayments, myLoans, cfgRows] = await Promise.all([
    db.select().from(payments).where(eq(payments.memberId, me.id)).orderBy(desc(payments.paidOn)).limit(50),
    db.select().from(loans).where(and(eq(loans.memberId, me.id), eq(loans.active, true))),
    db.select({ easyPaiseName: configTbl.easyPaiseName, easyPaiseNumber: configTbl.easyPaiseNumber }).from(configTbl).where(eq(configTbl.id, 1)).limit(1),
  ]);
  const cfg = cfgRows[0];

  const verifiedTotal = myPayments
    .filter((p) => !p.pendingVerify)
    .reduce((a, p) => a + p.amount, 0);
  const pendingPayments = myPayments.filter((p) => p.pendingVerify);
  const rejectedTotal = pendingPayments
    .filter((p) => p.supervisorRejectedAt)
    .reduce((a, p) => a + p.amount, 0);
  const pendingTotal = pendingPayments
    .filter((p) => !p.supervisorRejectedAt)
    .reduce((a, p) => a + p.amount, 0);

  return (
    <div className="mx-auto max-w-[1400px]">
      <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Account' }]} />
      <header className="mb-8 border-b border-[var(--border)] pb-6">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-[var(--txt-3)]">Member · Account</div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.5px] text-[var(--color-cream)]">My Account</h1>
        <p className="font-[var(--font-arabic)] mt-1 text-sm text-[var(--color-gold-2)]">میرا کھاتہ</p>
      </header>

      <Card className="mb-6 overflow-hidden">
        <CardBody className="p-6">
          <div className="mb-4 flex items-center gap-4">
            <div
              className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full text-xl font-bold text-white shadow-[0_0_12px_rgba(214,210,199,0.2)]"
              style={{ background: me.color }}
              aria-hidden="true"
            >
              {me.photoUrl ? (
                <img src={me.photoUrl} alt="" className="size-full rounded-full object-cover" />
              ) : (
                ini(me.nameEn || me.nameUr)
              )}
            </div>
            <div className="flex-1">
              <div className="font-[var(--font-arabic)] text-xl text-[var(--color-gold-2)]">{me.nameUr}</div>
              <div className="font-[var(--font-en)] text-sm text-[var(--color-gold-4)]">{me.nameEn}</div>
              <div className="mt-1 text-xs text-[var(--txt-3)]">
                {me.relation || ''}{me.fatherName && me.fatherName !== '—' ? ` · ${me.fatherName}` : ''}
              </div>
            </div>
          </div>
          <div className="text-xs text-[var(--color-gold-4)]">My Verified Total</div>
          <div className="font-[var(--font-display)] text-3xl font-bold text-[var(--color-gold)]">{fmtRs(verifiedTotal)}</div>
          {pendingTotal > 0 && (
            <div className="mt-1 text-xs text-[var(--color-gold-2)]">
              + {fmtRs(pendingTotal)} awaiting verification
            </div>
          )}
          {rejectedTotal > 0 && (
            <div className="mt-1 text-xs text-[#f08585]">
              {fmtRs(rejectedTotal)} rejected by supervisor — contact admin
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Submit a Donation</CardTitle></CardHeader>
        <CardBody>
          <DonationForm easyPaiseName={cfg?.easyPaiseName ?? null} easyPaiseNumber={cfg?.easyPaiseNumber ?? null} />
        </CardBody>
      </Card>

      {myLoans.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle>My Active Loans</CardTitle></CardHeader>
          <CardBody className="p-0">
            <div className="border-b border-[rgba(214,210,199,0.06)] bg-[rgba(200,155,60,0.04)] px-4 py-2.5 text-xs text-[var(--txt-3)]">
              To report a repayment, send a message to the admin with the loan amount and transfer reference. The admin will record it.
            </div>
            <div className="divide-y divide-[rgba(214,210,199,0.06)]">
              {myLoans.map((loan) => {
                const remaining = loan.amount - loan.paid;
                const pct = loan.amount > 0 ? Math.round((loan.paid / loan.amount) * 100) : 0;
                return (
                  <div key={loan.id} className="px-4 py-3">
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-[var(--color-cream)]">{loan.purpose}</div>
                      <div className="text-right">
                        <div className="font-[var(--font-display)] text-base font-bold text-[var(--color-gold)]">{fmtRs(loan.amount)}</div>
                        <div className="text-[10px] text-[var(--txt-3)]">total</div>
                      </div>
                    </div>
                    <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/20">
                      <div className="h-full bg-gradient-to-r from-[var(--color-emerald-2)] to-[var(--color-gold)]" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-[var(--txt-3)]">
                      <span>Paid: <span className="text-[var(--color-gold-2)]">{fmtRs(loan.paid)}</span></span>
                      <span>Remaining: <span className="text-[#f08585]">{fmtRs(remaining)}</span></span>
                      <span>{pct}%</span>
                    </div>
                    {loan.expectedReturn && (
                      <div className="mt-1.5 text-xs text-[var(--txt-4)]">
                        Due: <span className="text-[var(--txt-2)]">{new Date(loan.expectedReturn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>My Payment History</CardTitle>
          <a
            href="/api/exports/my-statement"
            className="text-[11px] font-semibold tracking-wide text-[var(--color-gold-4)] transition-colors hover:text-[var(--color-gold-2)]"
          >
            ↓ Download my statement (CSV)
          </a>
        </CardHeader>
        <CardBody className="p-0">
          {myPayments.length === 0 ? (
            <div className="p-10 text-center text-sm italic text-[var(--txt-3)]">
              No payments yet — submit your first donation to start contributing.
            </div>
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">Payment history</caption>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[rgba(214,210,199,0.06)] text-left text-[10px] uppercase tracking-[1px] text-[var(--color-gold-4)]">
                  <th scope="col" className="px-4 py-2.5">Month</th>
                  <th scope="col" className="px-4 py-2.5">Pool</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Amount</th>
                  <th scope="col" className="px-4 py-2.5">Status</th>
                  <th scope="col" className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {myPayments.map((p) => (
                  <tr key={p.id} className="border-b border-[rgba(214,210,199,0.06)]">
                    <td className="px-4 py-2.5">{p.monthLabel}</td>
                    <td className="px-4 py-2.5 capitalize">{p.pool}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-[var(--color-gold)]">{fmtRs(p.amount)}</td>
                    <td className="px-4 py-2.5">
                      {p.pendingVerify && p.supervisorRejectedAt ? (
                        <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs text-red-300">❌ Rejected</span>
                      ) : p.pendingVerify ? (
                        <span className="rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs text-yellow-300">⏳ Pending</span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300">✓ Verified</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--txt-3)]">
                      {new Date(p.paidOn).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

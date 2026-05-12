import { eq, desc } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { payments } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { fmtRs } from '@/lib/i18n/dict';
import { ini } from '@/lib/utils';
import DonationForm from './donation-form';

export default async function MyAccountPage() {
  const me = await getMeOrRedirect();

  const myPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.memberId, me.id))
    .orderBy(desc(payments.paidOn))
    .limit(50);

  const verifiedTotal = myPayments
    .filter((p) => !p.pendingVerify)
    .reduce((a, p) => a + p.amount, 0);
  const pendingTotal = myPayments
    .filter((p) => p.pendingVerify)
    .reduce((a, p) => a + p.amount, 0);

  return (
    <div>
      <header className="mb-6 border-b border-[var(--border)] pb-4">
        <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">میرا کھاتہ</h1>
        <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">My Account</p>
      </header>

      <Card className="mb-4 overflow-hidden">
        <CardBody className="p-6">
          <div className="mb-4 flex items-center gap-4">
            <div
              className="grid size-14 place-items-center rounded-full text-xl font-bold text-white shadow-[0_0_12px_rgba(214,210,199,0.2)]"
              style={{ background: me.color }}
              aria-hidden="true"
            >
              {me.photoUrl ? (
                <img src={me.photoUrl} alt="" className="size-full rounded-full object-cover" />
              ) : (
                ini(me.nameEn)
              )}
            </div>
            <div className="flex-1">
              <div className="font-[var(--font-arabic)] text-xl text-[var(--color-gold-2)]">{me.nameUr}</div>
              <div className="font-[var(--font-en)] text-sm text-[var(--color-gold-4)]">{me.nameEn}</div>
              <div className="mt-1 text-xs text-[var(--txt-3)]">
                {me.relation || ''} {me.fatherName ? `· ${me.fatherName}` : ''}
              </div>
            </div>
          </div>
          <div className="text-xs text-[var(--color-gold-4)]">My Verified Total</div>
          <div className="font-[var(--font-display)] text-3xl font-bold text-[var(--color-gold)]">{fmtRs(verifiedTotal)}</div>
          {pendingTotal > 0 && (
            <div className="mt-1 text-xs text-[var(--color-gold-2)]">
              + {fmtRs(pendingTotal)} awaiting admin verification
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>🤲 Submit a Donation</CardTitle></CardHeader>
        <CardBody>
          <DonationForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Payment History</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {myPayments.length === 0 ? (
            <div className="p-10 text-center text-sm italic text-[var(--txt-3)]">
              No payments yet — submit your first donation to start contributing.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[rgba(214,210,199,0.06)] text-left text-[10px] uppercase tracking-[1px] text-[var(--color-gold-4)]">
                  <th className="px-4 py-2.5">Month</th>
                  <th className="px-4 py-2.5">Pool</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {myPayments.map((p) => (
                  <tr key={p.id} className="border-b border-[rgba(214,210,199,0.06)]">
                    <td className="px-4 py-2.5">{p.monthLabel}</td>
                    <td className="px-4 py-2.5 capitalize">{p.pool}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-[var(--color-gold)]">{fmtRs(p.amount)}</td>
                    <td className="px-4 py-2.5">
                      {p.pendingVerify ? (
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

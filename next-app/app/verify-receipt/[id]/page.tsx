import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { payments } from '@/lib/db/schema';
import { fmtRs } from '@/lib/i18n/dict';
import { Crescent as CrescentMark } from '@/components/icons/crescent';

export const metadata = { title: 'Receipt Verification · Barakah Hub' };

/**
 * Public receipt check — the QR on the emailed slip lands here. Shows
 * that the receipt is genuine and its figures; never the donor's name
 * (sadqa privacy holds even on the verification page).
 */
export default async function VerifyReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const valid = /^[0-9a-f-]{36}$/i.test(id);
  const [p] = valid
    ? await db.select().from(payments).where(eq(payments.id, id)).limit(1)
    : [];
  const ok = p && p.status === 'verified';

  return (
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[rgba(214,210,199,0.04)] p-8 text-center shadow-xl">
        <span className="mb-4 inline-grid size-12 place-items-center rounded-full bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)]">
          <CrescentMark className="size-6 text-[var(--color-ink)]" title="" />
        </span>
        {ok ? (
          <>
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,138,95,0.45)] bg-[rgba(45,138,95,0.12)] px-4 py-1.5 text-sm font-semibold text-[#4ec38d]">
              ✓ Verified receipt · تصدیق شدہ رسید
            </div>
            <div className="num-display mt-2 text-4xl text-[var(--color-gold-2)]">{fmtRs(p.amount)}</div>
            <div className="mt-3 space-y-1 text-sm text-[var(--txt-2)]">
              <div className="capitalize">{p.pool} · {p.monthLabel}</div>
              <div className="text-xs text-[var(--txt-3)]">
                Verified on {p.verifiedAt ? new Date(p.verifiedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date(p.paidOn).toLocaleDateString('en-GB')}
              </div>
              <div className="num text-xs text-[var(--color-gold-4)]">Receipt #{p.id.slice(0, 8).toUpperCase()}</div>
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-[var(--txt-4)]">
              This contribution is recorded on Barakah Hub&apos;s tamper-evident
              ledger. Donor identity is never shown · صدقہ کی رازداری
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(220,82,82,0.45)] bg-[rgba(220,82,82,0.12)] px-4 py-1.5 text-sm font-semibold text-[#f08585]">
              ✕ Not a verified receipt
            </div>
            <p className="mt-3 text-sm text-[var(--txt-2)]">
              This code doesn&apos;t match any verified contribution. The payment
              may still be in the approval flow, or the receipt is not genuine.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

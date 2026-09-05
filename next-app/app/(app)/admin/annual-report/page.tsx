import { redirect } from 'next/navigation';
import { and, eq, gte, lte, sql, inArray } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments, cases, loans, repayments } from '@/lib/db/schema';
import { fmtRs } from '@/lib/i18n/dict';
import { gregorianToHijriYear, hijriYearRange, formatHijriDate } from '@/lib/hijri';
import PrintButton from './print-button';

export const metadata = { title: 'Annual Report · Barakah Hub' };

interface Props { searchParams: Promise<{ year?: string }> }

export default async function AnnualReportPage({ searchParams }: Props) {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') redirect('/dashboard');

  const params = await searchParams;
  const currentHijri = gregorianToHijriYear(new Date());
  const requestedYear = params.year ? parseInt(params.year, 10) : currentHijri;
  const safeYear = Number.isFinite(requestedYear) && requestedYear >= 1300 && requestedYear <= 1600 ? requestedYear : currentHijri;
  const { from, to } = hijriYearRange(safeYear);

  // Aggregate by pool
  const poolTotals = await db
    .select({ pool: payments.pool, total: sql<number>`SUM(${payments.amount})::int`, count: sql<number>`COUNT(*)::int` })
    .from(payments)
    .where(and(eq(payments.status, 'verified'), gte(payments.createdAt, from), lte(payments.createdAt, to)))
    .groupBy(payments.pool);
  const totalIncome = poolTotals.reduce((s, p) => s + Number(p.total), 0);

  // Disbursed cases
  const disbursedCases = await db
    .select({ category: cases.category, total: sql<number>`SUM(${cases.amount})::int`, count: sql<number>`COUNT(*)::int` })
    .from(cases)
    .where(and(eq(cases.status, 'disbursed'), gte(cases.createdAt, from), lte(cases.createdAt, to)))
    .groupBy(cases.category);
  const totalDisbursed = disbursedCases.reduce((s, c) => s + Number(c.total), 0);

  // Loan activity
  const [loansIssuedAgg] = await db
    .select({ total: sql<number>`COALESCE(SUM(${loans.amount}),0)::int`, count: sql<number>`COUNT(*)::int` })
    .from(loans)
    .where(and(gte(loans.issuedOn, sql`${from.toISOString().slice(0, 10)}::date`), lte(loans.issuedOn, sql`${to.toISOString().slice(0, 10)}::date`)));
  // repayments made during this Hijri year
  const [loansRepaidAgg] = await db
    .select({ total: sql<number>`COALESCE(SUM(${repayments.amount}),0)::int` })
    .from(repayments)
    .where(and(gte(repayments.paidOn, sql`${from.toISOString().slice(0, 10)}::date`), lte(repayments.paidOn, sql`${to.toISOString().slice(0, 10)}::date`)));

  // Member milestones
  const [newMembersAgg] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(members)
    .where(and(gte(members.createdAt, from), lte(members.createdAt, to)));
  const [activeAgg] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(members)
    .where(and(eq(members.status, 'approved'), eq(members.deceased, false)));

  // Every contributor: total, count, which months, and the last payment
  // date — "kis ne kitna diya, kab kab diya" in one table.
  const topContributors = await db
    .select({
      memberId: payments.memberId,
      total: sql<number>`SUM(${payments.amount})::int`,
      count: sql<number>`COUNT(*)::int`,
      months: sql<string[]>`ARRAY_AGG(DISTINCT ${payments.monthLabel})`,
      lastPaid: sql<string>`MAX(${payments.paidOn})::text`,
    })
    .from(payments)
    .where(and(eq(payments.status, 'verified'), gte(payments.createdAt, from), lte(payments.createdAt, to)))
    .groupBy(payments.memberId)
    .orderBy(sql`SUM(${payments.amount}) DESC`);

  // Resolve names for the top contributors. Guard the empty case —
  // `ANY('{}')` / an empty array param crashes the Neon HTTP driver, which
  // was taking the whole report page down when there were no donations yet.
  const topIds = topContributors.map((t) => t.memberId);
  const memberMap = new Map(
    topIds.length
      ? (await db
          .select({ id: members.id, nameEn: members.nameEn, nameUr: members.nameUr })
          .from(members)
          .where(inArray(members.id, topIds))
        ).map((m) => [m.id, m])
      : [],
  );

  return (
    <div className="report-root mx-auto max-w-[1400px] print:bg-white print:text-black">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-5 print:border-gray-300">
        <div>
          <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)] print:text-gray-900">سالانہ رپورٹ</h1>
          <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)] print:text-gray-600">
            Annual Report · {safeYear} AH ({formatHijriDate(from)} → {formatHijriDate(to)})
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <form method="get">
            <label htmlFor="report-year" className="text-xs text-[var(--color-gold-4)]">Year:</label>
            <input id="report-year" type="number" name="year" defaultValue={safeYear} min={1300} max={1600} className="ml-2 w-24 rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-2 py-1.5 text-sm text-[var(--color-cream)]" />
            <button type="submit" className="ml-2 rounded-md bg-[var(--color-gold)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]">Load</button>
          </form>
          <PrintButton />
        </div>
      </div>

      {/* Headline numbers */}
      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <Stat label="Total Income" value={fmtRs(totalIncome)} sub={`${poolTotals.reduce((s, p) => s + Number(p.count), 0)} verified donations`} />
        <Stat label="Disbursed" value={fmtRs(totalDisbursed)} sub={`${disbursedCases.reduce((s, c) => s + Number(c.count), 0)} cases`} />
        <Stat label="Qarz Issued" value={fmtRs(Number(loansIssuedAgg?.total ?? 0))} sub={`${Number(loansIssuedAgg?.count ?? 0)} loans · ${fmtRs(Number(loansRepaidAgg?.total ?? 0))} repaid`} />
        <Stat label="Members" value={Number(activeAgg?.count ?? 0)} sub={`${Number(newMembersAgg?.count ?? 0)} new this year`} />
      </section>

      {/* By pool */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[rgba(200,155,60,0.03)] p-5 print:border-gray-300 print:bg-white">
        <h2 className="mb-4 font-[var(--font-display)] text-sm uppercase tracking-[3px] text-[var(--color-gold-4)] print:text-gray-600">Income by pool</h2>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-[var(--color-gold-4)]">
            <tr className="border-b border-[var(--border)]">
              <th className="px-2 py-2 text-left">Pool</th>
              <th className="px-2 py-2 text-right">Donations</th>
              <th className="px-2 py-2 text-right">Total</th>
              <th className="px-2 py-2 text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {poolTotals.map((p) => (
              <tr key={p.pool} className="border-b border-[rgba(200,155,60,0.06)]">
                <td className="px-2 py-2 capitalize text-[var(--color-cream)]">{p.pool}</td>
                <td className="px-2 py-2 text-right font-[var(--font-en)] text-[var(--txt-2)]">{p.count}</td>
                <td className="px-2 py-2 text-right font-bold text-[var(--color-gold-2)]">{fmtRs(Number(p.total))}</td>
                <td className="px-2 py-2 text-right text-[var(--txt-3)]">{totalIncome > 0 ? Math.round((Number(p.total) / totalIncome) * 100) : 0}%</td>
              </tr>
            ))}
            {poolTotals.length === 0 && <tr><td colSpan={4} className="py-6 text-center italic text-[var(--txt-3)]">No income recorded for {safeYear} AH</td></tr>}
          </tbody>
        </table>
      </section>

      {/* Case disbursements */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[rgba(200,155,60,0.03)] p-5 print:border-gray-300 print:bg-white">
        <h2 className="mb-4 font-[var(--font-display)] text-sm uppercase tracking-[3px] text-[var(--color-gold-4)] print:text-gray-600">Disbursed cases by category</h2>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-[var(--color-gold-4)]">
            <tr className="border-b border-[var(--border)]">
              <th className="px-2 py-2 text-left">Category</th>
              <th className="px-2 py-2 text-right">Cases</th>
              <th className="px-2 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {disbursedCases.map((c) => (
              <tr key={c.category} className="border-b border-[rgba(200,155,60,0.06)]">
                <td className="px-2 py-2 text-[var(--color-cream)]">{c.category}</td>
                <td className="px-2 py-2 text-right font-[var(--font-en)] text-[var(--txt-2)]">{c.count}</td>
                <td className="px-2 py-2 text-right font-bold text-[var(--color-gold-2)]">{fmtRs(Number(c.total))}</td>
              </tr>
            ))}
            {disbursedCases.length === 0 && <tr><td colSpan={3} className="py-6 text-center italic text-[var(--txt-3)]">No disbursements yet</td></tr>}
          </tbody>
        </table>
      </section>

      {/* Top contributors — admin-only; hidden when printing to protect donor privacy */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[rgba(200,155,60,0.03)] p-5 print:hidden">
        <h2 className="mb-4 font-[var(--font-display)] text-sm uppercase tracking-[3px] text-[var(--color-gold-4)] print:text-gray-600">Member contributions · who gave what, and when (admin view)</h2>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-[var(--color-gold-4)]">
            <tr className="border-b border-[var(--border)]">
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 py-2 text-left">Member</th>
              <th className="px-2 py-2 text-left">Months covered</th>
              <th className="px-2 py-2 text-right">Donations</th>
              <th className="px-2 py-2 text-right">Last paid</th>
              <th className="px-2 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {topContributors.map((t, i) => {
              const m = memberMap.get(t.memberId);
              return (
                <tr key={t.memberId} className="border-b border-[rgba(200,155,60,0.06)]">
                  <td className="px-2 py-2 font-[var(--font-en)] text-[var(--color-gold-4)]">{i + 1}</td>
                  <td className="px-2 py-2 text-[var(--color-cream)]">{m?.nameEn ?? m?.nameUr ?? 'Member'}</td>
                  <td className="max-w-[280px] px-2 py-2 text-xs text-[var(--txt-3)]">
                    {(t.months ?? []).map((mo) => mo.split(' ')[0]?.slice(0, 3)).join(' · ')}
                  </td>
                  <td className="px-2 py-2 text-right font-[var(--font-en)] text-[var(--txt-2)]">{Number(t.count)}</td>
                  <td className="tabular px-2 py-2 text-right text-xs text-[var(--txt-3)]">{t.lastPaid ? new Date(t.lastPaid).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</td>
                  <td className="px-2 py-2 text-right font-bold text-[var(--color-gold-2)]">{fmtRs(Number(t.total))}</td>
                </tr>
              );
            })}
            {topContributors.length === 0 && <tr><td colSpan={6} className="py-6 text-center italic text-[var(--txt-3)]">No donations yet</td></tr>}
          </tbody>
        </table>
      </section>

      <footer className="mt-8 border-t border-[var(--border)] pt-4 text-center text-[10px] uppercase tracking-widest text-[var(--color-gold-4)] print:border-gray-300 print:text-gray-500">
        Generated on {new Date().toLocaleDateString('en-GB')} · {formatHijriDate(new Date())} · Barakah Hub
      </footer>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[rgba(200,155,60,0.04)] p-4 print:border-gray-300 print:bg-white">
      <div className="font-[var(--font-display)] text-[10px] uppercase tracking-widest text-[var(--color-gold-4)] print:text-gray-600">{label}</div>
      <div className="mt-1 font-[var(--font-en)] text-2xl font-bold text-[var(--color-gold-2)] print:text-gray-900">{value}</div>
      <div className="mt-1 text-[11px] text-[var(--txt-3)] print:text-gray-500">{sub}</div>
    </div>
  );
}

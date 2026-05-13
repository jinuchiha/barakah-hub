import { redirect } from 'next/navigation';
import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments, cases, loans } from '@/lib/db/schema';
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
    .where(and(eq(payments.pendingVerify, false), gte(payments.createdAt, from), lte(payments.createdAt, to)))
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
  const [loansRepaidAgg] = await db
    .select({ total: sql<number>`COALESCE(SUM(${loans.paid}),0)::int` })
    .from(loans)
    .where(and(gte(loans.issuedOn, sql`${from.toISOString().slice(0, 10)}::date`), lte(loans.issuedOn, sql`${to.toISOString().slice(0, 10)}::date`)));

  // Member milestones
  const [newMembersAgg] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(members)
    .where(and(gte(members.createdAt, from), lte(members.createdAt, to)));
  const [activeAgg] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(members)
    .where(and(eq(members.status, 'approved'), eq(members.deceased, false)));

  // Top contributors (anonymous totals — we show count of payments per pool)
  const topContributors = await db
    .select({
      memberId: payments.memberId,
      total: sql<number>`SUM(${payments.amount})::int`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(payments)
    .where(and(eq(payments.pendingVerify, false), gte(payments.createdAt, from), lte(payments.createdAt, to)))
    .groupBy(payments.memberId)
    .orderBy(sql`SUM(${payments.amount}) DESC`)
    .limit(10);

  const memberMap = new Map(
    (await db.select({ id: members.id, nameEn: members.nameEn, nameUr: members.nameUr }).from(members)
      .where(sql`${members.id} = ANY(${topContributors.map((t) => t.memberId)})`))
      .map((m) => [m.id, m]),
  );

  return (
    <div className="report-root print:bg-white print:text-black">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4 print:border-gray-300">
        <div>
          <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)] print:text-gray-900">سالانہ رپورٹ</h1>
          <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)] print:text-gray-600">
            Annual Report · {safeYear} AH ({formatHijriDate(from)} → {formatHijriDate(to)})
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <form method="get">
            <label className="text-xs text-[var(--color-gold-4)]">Year:</label>
            <input type="number" name="year" defaultValue={safeYear} min={1300} max={1600} className="ml-2 w-24 rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-2 py-1.5 text-sm text-[var(--color-cream)]" />
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

      {/* Top contributors */}
      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[rgba(200,155,60,0.03)] p-5 print:border-gray-300 print:bg-white">
        <h2 className="mb-4 font-[var(--font-display)] text-sm uppercase tracking-[3px] text-[var(--color-gold-4)] print:text-gray-600">Top contributors (admin view)</h2>
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-[var(--color-gold-4)]">
            <tr className="border-b border-[var(--border)]">
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 py-2 text-left">Member</th>
              <th className="px-2 py-2 text-right">Donations</th>
              <th className="px-2 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {topContributors.map((t, i) => {
              const m = memberMap.get(t.memberId);
              return (
                <tr key={t.memberId} className="border-b border-[rgba(200,155,60,0.06)]">
                  <td className="px-2 py-2 font-[var(--font-en)] text-[var(--color-gold-4)]">{i + 1}</td>
                  <td className="px-2 py-2 text-[var(--color-cream)]">{m?.nameEn ?? m?.nameUr ?? '—'}</td>
                  <td className="px-2 py-2 text-right font-[var(--font-en)] text-[var(--txt-2)]">{Number(t.count)}</td>
                  <td className="px-2 py-2 text-right font-bold text-[var(--color-gold-2)]">{fmtRs(Number(t.total))}</td>
                </tr>
              );
            })}
            {topContributors.length === 0 && <tr><td colSpan={4} className="py-6 text-center italic text-[var(--txt-3)]">No donations yet</td></tr>}
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

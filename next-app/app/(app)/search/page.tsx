import Link from 'next/link';
import { eq, and, or, desc, ilike, sql } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments, cases, loans } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { fmtRs } from '@/lib/i18n/dict';
import { ini } from '@/lib/utils';

export const metadata = { title: 'Search · Barakah Hub' };

interface Props { searchParams: Promise<{ q?: string }> }

export default async function SearchPage({ searchParams }: Props) {
  const me = await getMeOrRedirect();

  const { q } = await searchParams;
  const term = (q ?? '').trim().slice(0, 80);
  const isAdmin = me.role === 'admin';

  if (!term) {
    return (
      <div className="max-w-3xl">
        <header className="mb-6 border-b border-[var(--border)] pb-4">
          <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">تلاش</h1>
          <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">
            Use the search bar above. Searches members{isAdmin ? ', payments, cases, loans' : ' and cases'}.
          </p>
        </header>
      </div>
    );
  }

  const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

  // Members are visible to everyone (approved-only for non-admin)
  const memberQuery = db
    .select()
    .from(members)
    .where(
      and(
        isAdmin ? sql`TRUE` : eq(members.status, 'approved'),
        or(
          ilike(members.nameEn, like),
          ilike(members.nameUr, like),
          ilike(members.fatherName, like),
          ilike(members.username, like),
          ilike(members.city, like),
          ilike(members.phone, like),
        ),
      ),
    )
    .limit(20);

  const caseQuery = db
    .select()
    .from(cases)
    .where(or(ilike(cases.beneficiaryName, like), ilike(cases.reasonEn, like), ilike(cases.reasonUr, like)))
    .orderBy(desc(cases.createdAt))
    .limit(20);

  // Payments + loans only for admins (sadqa privacy)
  const paymentQuery: Promise<(typeof payments.$inferSelect)[]> = isAdmin
    ? db
        .select()
        .from(payments)
        .where(or(ilike(payments.note, like), ilike(payments.monthLabel, like)))
        .orderBy(desc(payments.createdAt))
        .limit(20)
    : Promise.resolve([]);

  const loanQuery: Promise<(typeof loans.$inferSelect)[]> = isAdmin
    ? db.select().from(loans).where(ilike(loans.purpose, like)).limit(20)
    : Promise.resolve([]);

  const [memberHits, caseHits, paymentHits, loanHits] = await Promise.all([
    memberQuery,
    caseQuery,
    paymentQuery,
    loanQuery,
  ]);

  const memMap = new Map(memberHits.map((m) => [m.id, m]));
  const totalHits = memberHits.length + caseHits.length + paymentHits.length + loanHits.length;

  return (
    <div className="max-w-3xl">
      <header className="mb-6 border-b border-[var(--border)] pb-4">
        <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">تلاش</h1>
        <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">
          {totalHits} result{totalHits === 1 ? '' : 's'} for &quot;{term}&quot;
        </p>
      </header>

      {memberHits.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle>👥 Members ({memberHits.length})</CardTitle></CardHeader>
          <CardBody className="p-0">
            {memberHits.map((m) => (
              <Link key={m.id} href={`/tree?focus=${m.id}`} className="flex items-center gap-3 border-b border-[rgba(201,168,76,0.06)] px-3 py-2.5 hover:bg-[rgba(201,168,76,0.04)]">
                <div className="grid size-8 place-items-center rounded-full text-xs font-bold text-white" style={{ background: m.color }}>{ini(m.nameEn || m.nameUr)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--color-cream)]">{m.nameEn || m.nameUr}</div>
                  <div className="text-[11px] text-[var(--color-gold-4)]">s/o {m.fatherName}{m.city ? ` · ${m.city}` : ''}</div>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-gold-4)]">{m.role === 'admin' ? 'admin' : m.status}</span>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}

      {caseHits.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle>🚨 Cases ({caseHits.length})</CardTitle></CardHeader>
          <CardBody className="p-0">
            {caseHits.map((c) => (
              <div key={c.id} className="border-b border-[rgba(201,168,76,0.06)] px-3 py-2.5">
                <div className="text-sm font-semibold text-[var(--color-cream)]">{c.beneficiaryName} · {fmtRs(c.amount)}</div>
                <div className="text-[11px] text-[var(--txt-3)]">{c.reasonEn}</div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {isAdmin && paymentHits.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle>💰 Payments ({paymentHits.length})</CardTitle></CardHeader>
          <CardBody className="p-0">
            {paymentHits.map((p) => (
              <div key={p.id} className="border-b border-[rgba(201,168,76,0.06)] px-3 py-2.5">
                <div className="text-sm text-[var(--color-cream)]">{memMap.get(p.memberId)?.nameEn ?? '—'} · {fmtRs(p.amount)}</div>
                <div className="text-[11px] text-[var(--txt-3)]">{p.monthLabel}{p.note ? ` · ${p.note}` : ''}</div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {isAdmin && loanHits.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle>📋 Loans ({loanHits.length})</CardTitle></CardHeader>
          <CardBody className="p-0">
            {loanHits.map((l) => (
              <div key={l.id} className="border-b border-[rgba(201,168,76,0.06)] px-3 py-2.5">
                <div className="text-sm text-[var(--color-cream)]">{l.purpose} · {fmtRs(l.amount)}</div>
                <div className="text-[11px] text-[var(--txt-3)]">Paid {fmtRs(l.paid)} of {fmtRs(l.amount)}</div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {totalHits === 0 && (
        <Card>
          <CardBody className="py-12 text-center text-sm italic text-[var(--txt-3)]">
            No matches for &quot;{term}&quot;.
          </CardBody>
        </Card>
      )}
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { and, gte, lt, eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { payments, cases, loans, members } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Annual summary (admin) for a given ?year=YYYY (defaults to current year). */
export async function GET(req: NextRequest) {
  try {
    const me = await meOrThrow();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const year = parseInt(new URL(req.url).searchParams.get('year') ?? '', 10) || new Date().getFullYear();
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    // loans.issuedOn is a DATE (string) column; payments/cases.createdAt are timestamps.
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    const [pays, caseRows, loanRows, memberRows] = await Promise.all([
      db.select().from(payments).where(and(gte(payments.createdAt, start), lt(payments.createdAt, end), eq(payments.pendingVerify, false))),
      db.select().from(cases).where(and(gte(cases.createdAt, start), lt(cases.createdAt, end))),
      db.select().from(loans).where(and(gte(loans.issuedOn, startDate), lt(loans.issuedOn, endDate))),
      db.select({ id: members.id, status: members.status, createdAt: members.createdAt }).from(members),
    ]);

    const pool = { sadaqah: 0, zakat: 0, qarz: 0 };
    for (const p of pays) pool[p.pool] += p.amount;

    const disbursed = caseRows.filter((c) => c.status === 'disbursed');
    const loanIssued = loanRows.reduce((s, l) => s + l.amount, 0);
    const loanRepaid = loanRows.reduce((s, l) => s + l.paid, 0);
    const newMembers = memberRows.filter((m) => m.createdAt >= start && m.createdAt < end).length;

    return NextResponse.json({
      year,
      collected: { ...pool, total: pool.sadaqah + pool.zakat + pool.qarz, count: pays.length },
      cases: {
        total: caseRows.length,
        approved: caseRows.filter((c) => c.status === 'approved').length,
        disbursed: disbursed.length,
        disbursedAmount: disbursed.reduce((s, c) => s + c.amount, 0),
      },
      loans: { issuedCount: loanRows.length, issuedAmount: loanIssued, repaidAmount: loanRepaid },
      members: { total: memberRows.filter((m) => m.status === 'approved').length, newThisYear: newMembers },
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

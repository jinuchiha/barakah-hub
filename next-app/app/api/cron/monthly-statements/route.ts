import { NextResponse } from 'next/server';
import { and, eq, sql, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { members, payments, cases, loans, users } from '@/lib/db/schema';
import { sendMonthlyStatementEmail } from '@/lib/email';
import { currentMonthLabel } from '@/lib/month';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Monthly statement — emails every approved member a personalised summary
 * for the current month: their contribution, the family fund total, open
 * emergency cases, and their outstanding qarz balance.
 *
 * Scheduled via vercel.json to fire at 9 AM on the 1st of each month.
 * Reads the "previous month" — i.e. when fired 2026-06-01 09:00, it
 * sends the May 2026 summary.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use last month's label so we summarise the just-ended period.
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthLabel = prev.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const approved = await db
    .select({ id: members.id, nameEn: members.nameEn, nameUr: members.nameUr, authId: members.authId })
    .from(members)
    .where(and(eq(members.status, 'approved'), eq(members.deceased, false)));

  if (approved.length === 0) return NextResponse.json({ sent: 0 });

  // Pull aggregates in one shot — cheaper than per-member queries.
  const [fundRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount}),0)::int` })
    .from(payments)
    .where(eq(payments.pendingVerify, false));
  const fundTotal = Number(fundRow?.total ?? 0);

  const openCases = await db.$count(cases, eq(cases.status, 'voting'));

  const memberIds = approved.map((m) => m.id);
  const myPayments = await db
    .select({ memberId: payments.memberId, total: sql<number>`COALESCE(SUM(${payments.amount}),0)::int` })
    .from(payments)
    .where(and(eq(payments.monthLabel, monthLabel), eq(payments.pendingVerify, false), inArray(payments.memberId, memberIds)))
    .groupBy(payments.memberId);
  const myTotalMap = new Map(myPayments.map((p) => [p.memberId, Number(p.total)]));

  const myLoans = await db
    .select({ memberId: loans.memberId, owed: sql<number>`COALESCE(SUM(${loans.amount} - ${loans.paid}),0)::int` })
    .from(loans)
    .where(and(eq(loans.active, true), inArray(loans.memberId, memberIds)))
    .groupBy(loans.memberId);
  const owedMap = new Map(myLoans.map((l) => [l.memberId, Number(l.owed)]));

  const authIds = approved.map((m) => m.authId).filter((v): v is string => !!v);
  const userRows = authIds.length
    ? await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, authIds))
    : [];
  const emailByAuthId = new Map(userRows.map((u) => [u.id, u.email]));

  let sent = 0;
  for (const m of approved) {
    if (!m.authId) continue;
    const email = emailByAuthId.get(m.authId);
    if (!email) continue;
    await sendMonthlyStatementEmail(email, {
      name: m.nameEn || m.nameUr,
      monthLabel,
      myTotal: myTotalMap.get(m.id) ?? 0,
      fundTotal,
      cases: openCases,
      loansOwed: owedMap.get(m.id) ?? 0,
    });
    sent++;
  }

  return NextResponse.json({ sent, monthLabel, fundTotal });
}

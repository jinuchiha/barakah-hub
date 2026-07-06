import { desc, eq, inArray } from 'drizzle-orm';
import { meApprovedOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { payments, loans, repayments } from '@/lib/db/schema';
import { csvResponse, toCsv } from '@/lib/csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Member's own statement — strictly self-scoped, unlike the admin-only
 * exports next door. One CSV with two sections: contributions, then
 * loan repayments.
 */
export async function GET() {
  let me;
  try {
    me = await meApprovedOrThrow();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const [myPayments, myLoans] = await Promise.all([
    db.select().from(payments).where(eq(payments.memberId, me.id)).orderBy(desc(payments.paidOn)),
    db.select().from(loans).where(eq(loans.memberId, me.id)),
  ]);
  const myRepayments = myLoans.length
    ? await db.select().from(repayments).where(inArray(repayments.loanId, myLoans.map((l) => l.id)))
    : [];

  const contributions = toCsv(
    ['Date', 'Month', 'Pool', 'Amount (Rs)', 'Status', 'Note'],
    myPayments.map((p) => [
      p.paidOn,
      p.monthLabel,
      p.pool,
      p.amount,
      p.pendingVerify ? 'pending verification' : 'verified',
      p.note,
    ]),
  );

  const loanSection = toCsv(
    ['Issued', 'Purpose', 'Amount (Rs)', 'Repaid (Rs)', 'Status'],
    myLoans.map((l) => [l.issuedOn, l.purpose, l.amount, l.paid, l.active ? 'active' : 'settled']),
  );

  const repaymentSection = toCsv(
    ['Date', 'Loan', 'Amount (Rs)', 'Note'],
    myRepayments.map((r) => [r.paidOn, r.loanId, r.amount, r.note]),
  );

  const body = `My Contributions\r\n${contributions}\r\nMy Loans\r\n${loanSection}\r\nMy Repayments\r\n${repaymentSection}`;
  return csvResponse('my-statement', body);
}

import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { repayments, loans } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await meOrThrow();
    const { id } = await params;

    const [loan] = await db.select().from(loans).where(eq(loans.id, id)).limit(1);
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    // Only the borrower or an admin may see repayment history.
    if (loan.memberId !== me.id && me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await db
      .select()
      .from(repayments)
      .where(eq(repayments.loanId, id))
      .orderBy(desc(repayments.paidOn));
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

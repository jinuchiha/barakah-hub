import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { loans, members } from '@/lib/db/schema';
import { issueLoan } from '@/app/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const me = await meOrThrow();
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const rows = await db
      .select({
        id: loans.id,
        memberId: loans.memberId,
        amount: loans.amount,
        paid: loans.paid,
        purpose: loans.purpose,
        installmentAmount: loans.installmentAmount,
        pool: loans.pool,
        city: loans.city,
        issuedOn: loans.issuedOn,
        expectedReturn: loans.expectedReturn,
        active: loans.active,
        caseId: loans.caseId,
        member: {
          id: members.id,
          nameEn: members.nameEn,
          nameUr: members.nameUr,
          color: members.color,
        },
      })
      .from(loans)
      .leftJoin(members, eq(loans.memberId, members.id))
      .orderBy(desc(loans.issuedOn));
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/** Issue a qarz loan (admin). Delegates to the issueLoan server action. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await issueLoan(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    const status = msg === 'Not authenticated' ? 401 : msg === 'Admin only' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

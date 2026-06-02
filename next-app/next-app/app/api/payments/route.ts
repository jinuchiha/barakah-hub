import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { payments, members } from '@/lib/db/schema';

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
        id: payments.id,
        memberId: payments.memberId,
        amount: payments.amount,
        pool: payments.pool,
        monthLabel: payments.monthLabel,
        monthStart: payments.monthStart,
        paidOn: payments.paidOn,
        note: payments.note,
        pendingVerify: payments.pendingVerify,
        verifiedById: payments.verifiedById,
        verifiedAt: payments.verifiedAt,
        createdAt: payments.createdAt,
        member: {
          id: members.id,
          nameEn: members.nameEn,
          nameUr: members.nameUr,
          color: members.color,
        },
      })
      .from(payments)
      .leftJoin(members, eq(payments.memberId, members.id))
      .orderBy(desc(payments.createdAt));
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

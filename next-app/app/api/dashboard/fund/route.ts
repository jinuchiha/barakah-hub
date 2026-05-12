import { NextResponse } from 'next/server';
import { eq, and, sum } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { payments, members } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await meOrThrow();

    const poolTotals = await db
      .select({ pool: payments.pool, total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.pendingVerify, false))
      .groupBy(payments.pool);

    const sadaqah = Number(poolTotals.find((r) => r.pool === 'sadaqah')?.total ?? 0);
    const zakat = Number(poolTotals.find((r) => r.pool === 'zakat')?.total ?? 0);
    const qarz = Number(poolTotals.find((r) => r.pool === 'qarz')?.total ?? 0);

    const pendingCount = await db.$count(payments, eq(payments.pendingVerify, true));

    const memberCount = await db.$count(
      members,
      and(eq(members.deceased, false), eq(members.status, 'approved')),
    );

    return NextResponse.json({ sadaqah, zakat, qarz, pendingCount, memberCount });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

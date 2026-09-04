import { NextResponse } from 'next/server';
import { eq, and, sum } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { payments, members } from '@/lib/db/schema';
import { poolBalances } from '@/lib/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const me = await meOrThrow();
    if (me.status !== 'approved' && me.role !== 'admin') {
      return NextResponse.json({ error: 'Account pending approval' }, { status: 403 });
    }

    const poolTotals = await db
      .select({ pool: payments.pool, total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.status, 'verified'))
      .groupBy(payments.pool);

    const sadaqah = Number(poolTotals.find((r) => r.pool === 'sadaqah')?.total ?? 0);
    const zakat = Number(poolTotals.find((r) => r.pool === 'zakat')?.total ?? 0);
    const qarz = Number(poolTotals.find((r) => r.pool === 'qarz')?.total ?? 0);

    const pendingCount = await db.$count(payments, eq(payments.pendingVerify, true));

    const memberCount = await db.$count(
      members,
      and(eq(members.deceased, false), eq(members.status, 'approved')),
    );

    // The per-pool figures above are gross verified INFLOW — the historical
    // meaning of this endpoint, kept as-is so existing clients do not shift
    // under them. But inflow is not a balance: it counts every rupee ever
    // disbursed as though it were still in the fund.
    //
    // `available` is the real position, from the ledger: inflow minus
    // outflow. It is what should gate a decision, and what a member asking
    // "how much do we have?" actually means.
    const ledger = await poolBalances();

    return NextResponse.json({
      // Gross verified contributions (unchanged meaning).
      sadaqah, zakat, qarz,
      pendingCount,
      memberCount,
      // Real position, per pool and in total.
      available: ledger.available,
      inflow: ledger.inflow,
      outflow: ledger.outflow,
      totalAvailable: ledger.totalAvailable,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

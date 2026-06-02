import { desc, eq } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments } from '@/lib/db/schema';
import { csvResponse, toCsv } from '@/lib/csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const rows = await db
    .select({
      id: payments.id,
      paidOn: payments.paidOn,
      monthLabel: payments.monthLabel,
      pool: payments.pool,
      amount: payments.amount,
      pendingVerify: payments.pendingVerify,
      memberName: members.nameEn,
      memberPhone: members.phone,
      note: payments.note,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .leftJoin(members, eq(payments.memberId, members.id))
    .orderBy(desc(payments.paidOn));

  const csv = toCsv(
    ['id', 'paid_on', 'month', 'pool', 'amount_pkr', 'verified', 'member', 'phone', 'note', 'created_at'],
    rows.map((r) => [
      r.id,
      r.paidOn,
      r.monthLabel,
      r.pool,
      r.amount,
      !r.pendingVerify,
      r.memberName ?? '',
      r.memberPhone ?? '',
      r.note ?? '',
      r.createdAt,
    ]),
  );

  return csvResponse('barakah-fund', csv);
}

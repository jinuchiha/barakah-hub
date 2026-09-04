import { desc, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments } from '@/lib/db/schema';
import { csvResponse, toCsv } from '@/lib/csv';
import { errorResponse } from '@/lib/api-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // Was getMeOrRedirect(), which issues redirect('/login') — inside a route
  // handler that surfaces as a 307 to an HTML page rather than a JSON 401,
  // and the mobile client only clears its session on a 401. requireAdmin
  // throws instead, and errorResponse maps it to the right status.
  try {
    await requireAdmin();
  } catch (err) {
    return errorResponse(err, 'app/api/exports/fund/route.ts');
  }

  const rows = await db
    .select({
      id: payments.id,
      paidOn: payments.paidOn,
      monthLabel: payments.monthLabel,
      pool: payments.pool,
      amount: payments.amount,
      status: payments.status,
      memberName: members.nameEn,
      memberPhone: members.phone,
      note: payments.note,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .leftJoin(members, eq(payments.memberId, members.id))
    // Verified only, so summing amount_pkr reconciles with every in-app
    // total (dashboard, statements, annual report all filter the same way).
    .where(eq(payments.status, 'verified'))
    .orderBy(desc(payments.paidOn));

  const csv = toCsv(
    ['id', 'paid_on', 'month', 'pool', 'amount_pkr', 'status', 'member', 'phone', 'note', 'created_at'],
    rows.map((r) => [
      r.id,
      r.paidOn,
      r.monthLabel,
      r.pool,
      r.amount,
      r.status,
      r.memberName ?? '',
      r.memberPhone ?? '',
      r.note ?? '',
      r.createdAt,
    ]),
  );

  return csvResponse('barakah-fund', csv);
}

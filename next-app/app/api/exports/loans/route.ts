import { desc, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, loans } from '@/lib/db/schema';
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
    return errorResponse(err, 'app/api/exports/loans/route.ts');
  }

  const rows = await db
    .select({
      id: loans.id,
      issuedOn: loans.issuedOn,
      expectedReturn: loans.expectedReturn,
      amount: loans.amount,
      paid: loans.paid,
      active: loans.active,
      purpose: loans.purpose,
      memberName: members.nameEn,
      memberPhone: members.phone,
    })
    .from(loans)
    .leftJoin(members, eq(loans.memberId, members.id))
    .orderBy(desc(loans.issuedOn));

  const csv = toCsv(
    ['id', 'issued_on', 'expected_return', 'amount_pkr', 'paid_pkr', 'remaining_pkr', 'active', 'purpose', 'member', 'phone'],
    rows.map((r) => [
      r.id,
      r.issuedOn,
      r.expectedReturn ?? '',
      r.amount,
      r.paid,
      r.amount - r.paid,
      r.active,
      r.purpose ?? '',
      r.memberName ?? '',
      r.memberPhone ?? '',
    ]),
  );

  return csvResponse('barakah-loans', csv);
}

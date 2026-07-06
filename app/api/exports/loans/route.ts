import { desc, eq } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, loans } from '@/lib/db/schema';
import { csvResponse, toCsv } from '@/lib/csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') return new Response('Forbidden', { status: 403 });

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

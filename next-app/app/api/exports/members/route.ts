import { asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
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
    return errorResponse(err, 'app/api/exports/members/route.ts');
  }

  const rows = await db.select().from(members).orderBy(asc(members.nameEn));

  const csv = toCsv(
    ['id', 'name_en', 'name_ur', 'father_name', 'username', 'phone', 'city', 'province', 'role', 'status', 'monthly_pledge_pkr', 'deceased', 'created_at'],
    rows.map((r) => [
      r.id,
      r.nameEn ?? '',
      r.nameUr ?? '',
      r.fatherName ?? '',
      r.username ?? '',
      r.phone ?? '',
      r.city ?? '',
      r.province ?? '',
      r.role,
      r.status,
      r.monthlyPledge,
      r.deceased,
      r.createdAt,
    ]),
  );

  return csvResponse('barakah-members', csv);
}

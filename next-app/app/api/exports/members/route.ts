import { asc } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { csvResponse, toCsv } from '@/lib/csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') return new Response('Forbidden', { status: 403 });

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

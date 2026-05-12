import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const me = await meOrThrow();

    // Admins see all; members see only approved non-deceased
    const rows = me.role === 'admin'
      ? await db.select().from(members).orderBy(asc(members.nameEn))
      : await db
          .select()
          .from(members)
          .where(eq(members.status, 'approved'))
          .orderBy(asc(members.nameEn));

    // Non-admins: strip sensitive fields
    if (me.role !== 'admin') {
      return NextResponse.json(
        rows.map(({ monthlyPledge: _mp, phone, ...rest }) => rest),
      );
    }

    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

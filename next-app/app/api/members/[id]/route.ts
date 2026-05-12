import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const me = await meOrThrow();
    const [member] = await db.select().from(members).where(eq(members.id, params.id)).limit(1);
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Non-admins can only view approved members, with reduced data
    if (me.role !== 'admin') {
      if (member.status !== 'approved') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      const { phone: _, monthlyPledge: __, ...safe } = member;
      return NextResponse.json(safe);
    }

    return NextResponse.json(member);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

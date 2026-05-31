import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { editMember } from '@/app/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await meOrThrow();
    const { id } = await params;
    const [member] = await db.select().from(members).where(eq(members.id, id)).limit(1);
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

/** Admin edit member (fields, role, status, spouse). Delegates to editMember. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    await editMember({ ...body, id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    const status = msg === 'Not authenticated' ? 401 : msg === 'Admin only' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

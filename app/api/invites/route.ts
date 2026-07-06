import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { memberInvites } from '@/lib/db/schema';
import { createInvite } from '@/app/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** List invites (admin). */
export async function GET() {
  try {
    const me = await meOrThrow();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const rows = await db.select().from(memberInvites).orderBy(desc(memberInvites.createdAt));
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/** Create an invite (admin). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const created = await createInvite(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    const status = msg === 'Not authenticated' ? 401 : msg === 'Admin only' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

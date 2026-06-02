import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { config as configTbl } from '@/lib/db/schema';
import { updateAdminConfig } from '@/app/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/config — returns the fund configuration (vote threshold, pledge, goal). */
export async function GET() {
  try {
    const me = await meOrThrow();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const [cfg] = await db.select().from(configTbl).where(eq(configTbl.id, 1)).limit(1);
    return NextResponse.json(cfg ?? {});
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/** PATCH /api/config — update vote threshold + default pledge (admin only). */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    await updateAdminConfig(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    const status = msg === 'Not authenticated' ? 401 : msg === 'Admin only' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { cases, auditLog } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ decision: z.enum(['approved', 'rejected']) });

/**
 * Admin force-resolve. Mirrors the `adminResolveCase` server action so
 * the mobile client (REST) and web (server actions) both work. Auditable
 * — every veto is logged with the admin's id.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await meOrThrow();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const { id: caseId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(caseId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const body = await req.json();
    const { decision } = schema.parse(body);

    const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!c) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    if (c.status !== 'voting') return NextResponse.json({ error: `Case already ${c.status}` }, { status: 409 });

    await db.update(cases).set({ status: decision, resolvedAt: new Date() }).where(eq(cases.id, caseId));
    await db.insert(auditLog).values({
      actorId: me.id,
      action: decision === 'approved' ? 'emergency-approved' : 'emergency-rejected',
      detail: `Admin veto: ${decision} for ${c.beneficiaryName} (${c.amount})`,
      targetId: c.applicantId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { payments, auditLog } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const me = await meOrThrow();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const [p] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.delete(payments).where(eq(payments.id, id));
    await db.insert(auditLog).values({
      actorId: me.id,
      action: 'payment-rejected',
      detail: `Rejected payment ${id} (${p.amount})`,
      targetId: p.memberId,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

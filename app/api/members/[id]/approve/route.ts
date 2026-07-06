import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, notifications, auditLog } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await meOrThrow();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: memberId } = await params;
    const [m] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (m.status === 'approved') return NextResponse.json({ ok: true });

    await db.update(members).set({ status: 'approved' }).where(eq(members.id, memberId));
    await db.insert(notifications).values({
      recipientId: memberId,
      titleUr: 'منظوری',
      titleEn: 'Approved',
      ur: 'آپ کا اکاؤنٹ منظور ہو گیا',
      en: 'Your account has been approved',
      type: 'approved',
    });
    await db.insert(auditLog).values({
      actorId: me.id,
      action: 'member-approved',
      detail: `Approved ${m.nameEn || m.nameUr}`,
      targetId: memberId,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

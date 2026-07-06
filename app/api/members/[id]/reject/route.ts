import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, auditLog, notifications } from '@/lib/db/schema';

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

    await db.update(members).set({ status: 'rejected' }).where(eq(members.id, memberId));
    await db.insert(notifications).values({
      recipientId: memberId,
      titleEn: 'Application not approved',
      titleUr: 'درخواست منظور نہیں ہوئی',
      en: 'Your membership application was not approved at this time. Please contact the administrator for details.',
      ur: 'آپ کی رکنیت کی درخواست اس وقت منظور نہیں ہوئی۔ تفصیل کے لیے ایڈمن سے رابطہ کریں۔',
      type: 'rejected',
    });
    await db.insert(auditLog).values({
      actorId: me.id,
      action: 'member-rejected',
      detail: `Rejected ${m.nameEn || m.nameUr}`,
      targetId: memberId,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

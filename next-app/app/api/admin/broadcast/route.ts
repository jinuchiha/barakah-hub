import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, notifications, auditLog } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  try {
    const me = await meOrThrow();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const payload = await req.json();
    const { subject, body } = schema.parse(payload);

    const approvedMembers = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.status, 'approved'), eq(members.deceased, false)));

    if (approvedMembers.length > 0) {
      const notifValues = approvedMembers.map((m) => ({
        recipientId: m.id,
        titleEn: subject,
        titleUr: subject,
        en: body,
        ur: body,
        type: 'broadcast',
      }));
      await db.insert(notifications).values(notifValues);
    }

    await db.insert(auditLog).values({
      actorId: me.id,
      action: 'broadcast-sent',
      detail: `Subject: ${subject} — to ${approvedMembers.length} members`,
    });

    return NextResponse.json({ ok: true, count: approvedMembers.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

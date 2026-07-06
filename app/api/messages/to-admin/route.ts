import { NextRequest, NextResponse } from 'next/server';
import { eq, and, asc } from 'drizzle-orm';
import { z } from 'zod';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { messages, members, auditLog } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  subject: z.string().min(3).max(120),
  body: z.string().min(10).max(2000),
});

/**
 * Mobile "Contact Admin" — sends a message to the first available
 * admin (in the messages table). Picked over a hardcoded admin id so
 * a single-admin family still works without configuration, and so
 * that if there are multiple admins the longest-tenured one (asc by
 * created_at) gets the inbound by default.
 *
 * Pending members CAN message admins — this is the primary channel
 * for "please approve my account".
 */
export async function POST(req: NextRequest) {
  try {
    const me = await meOrThrow();
    const body = await req.json();
    const data = schema.parse(body);

    // Find the first admin who isn't the sender themselves.
    const admins = await db
      .select()
      .from(members)
      .where(and(eq(members.role, 'admin'), eq(members.deceased, false)))
      .orderBy(asc(members.createdAt))
      .limit(5);
    const recipient = admins.find((a) => a.id !== me.id) ?? admins[0];

    if (!recipient) {
      return NextResponse.json({ error: 'No admin found' }, { status: 503 });
    }

    await db.insert(messages).values({
      fromId: me.id,
      toId: recipient.id,
      subject: data.subject,
      body: data.body,
    });

    await db.insert(auditLog).values({
      actorId: me.id,
      action: 'message-sent',
      detail: `Contact admin: ${data.subject.slice(0, 80)}`,
      targetId: recipient.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bad request';
    const status = msg === 'Not authenticated' ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

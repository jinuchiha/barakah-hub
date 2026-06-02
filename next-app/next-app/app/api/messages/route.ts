import { NextRequest, NextResponse } from 'next/server';
import { or, eq, inArray, desc } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { messages, members } from '@/lib/db/schema';
import { sendMessage } from '@/app/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** List my messages (sent + received) with sender/recipient names. */
export async function GET() {
  try {
    const me = await meOrThrow();
    const rows = await db
      .select()
      .from(messages)
      .where(or(eq(messages.toId, me.id), eq(messages.fromId, me.id)))
      .orderBy(desc(messages.createdAt))
      .limit(100);

    const ids = [...new Set(rows.flatMap((m) => [m.fromId, m.toId]))];
    const people = ids.length
      ? await db
          .select({ id: members.id, nameEn: members.nameEn, nameUr: members.nameUr, color: members.color })
          .from(members)
          .where(inArray(members.id, ids))
      : [];
    const byId = new Map(people.map((p) => [p.id, p]));

    const result = rows.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      from: byId.get(m.fromId) ?? null,
      to: byId.get(m.toId) ?? null,
      incoming: m.toId === me.id,
    }));
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/** Send a message to a specific member (admin reply / direct). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await sendMessage(body);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    const status = msg === 'Not authenticated' ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

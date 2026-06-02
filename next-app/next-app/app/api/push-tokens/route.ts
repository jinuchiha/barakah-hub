import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { pushTokens } from '@/lib/db/schema';

const registerSchema = z.object({
  token: z.string().min(8).max(500),
  platform: z.enum(['ios', 'android', 'web']),
});

export async function POST(req: Request) {
  try {
    const me = await meOrThrow();
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Upsert — if the same expo token is reused on a re-install, keep ownership current
    const existing = await db.select().from(pushTokens).where(eq(pushTokens.token, data.token)).limit(1);
    if (existing.length > 0) {
      await db
        .update(pushTokens)
        .set({ memberId: me.id, platform: data.platform, updatedAt: new Date() })
        .where(eq(pushTokens.token, data.token));
    } else {
      await db.insert(pushTokens).values({ memberId: me.id, token: data.token, platform: data.platform });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed';
    const status = msg === 'Not authenticated' ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

const unregisterSchema = z.object({ token: z.string().min(8).max(500) });

export async function DELETE(req: Request) {
  try {
    const me = await meOrThrow();
    const body = await req.json();
    const { token } = unregisterSchema.parse(body);

    // Only allow deletion of tokens owned by the caller
    await db.delete(pushTokens).where(and(eq(pushTokens.token, token), eq(pushTokens.memberId, me.id)));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed';
    const status = msg === 'Not authenticated' ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

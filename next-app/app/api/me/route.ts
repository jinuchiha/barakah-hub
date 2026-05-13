import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, auditLog } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const me = await meOrThrow();
    return NextResponse.json(me);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/**
 * PATCH /api/me — mobile-facing profile update.
 *
 * Mirrors the `updateProfile` server action so the Expo client can edit
 * the same fields without round-tripping through a server form. Fields
 * are individually optional so the client can submit partial updates
 * (e.g. just the phone number) without re-sending the whole profile.
 */
const patchSchema = z.object({
  nameUr: z.string().min(1).max(80).optional(),
  nameEn: z.string().min(1).max(80).optional(),
  phone: z.string().max(30).optional().nullable(),
  city: z.string().max(60).optional().nullable(),
  province: z.string().max(40).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  photoUrl: z.string().url().startsWith('https://').nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const me = await meOrThrow();
    const body = await req.json();
    const data = patchSchema.parse(body);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields provided' }, { status: 400 });
    }

    await db.update(members).set({ ...data, needsSetup: false }).where(eq(members.id, me.id));
    await db.insert(auditLog).values({
      actorId: me.id,
      action: 'profile-updated',
      detail: `Self-edit via mobile: ${Object.keys(data).join(', ')}`,
    });

    const [updated] = await db.select().from(members).where(eq(members.id, me.id)).limit(1);
    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bad request';
    const status = msg === 'Not authenticated' ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

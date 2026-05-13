import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { meOrThrow, getUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, auditLog } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Mobile-friendly onboarding.
 *
 * The mobile register screen only asks the user for `name`, `email`,
 * `password`, optional `phone` and `monthlyPledge`. The full web
 * onboarding form requires fatherName / city / province too — too
 * heavy for the mobile signup UX.
 *
 * This route accepts the minimal mobile signup payload and creates a
 * `members` row with status='pending', so the new account immediately
 * appears in /admin/members for approval. fatherName is required by
 * the schema so we default it to "—" and let the user fill it in
 * later via Edit Profile.
 *
 * Auth is required (user must already be signed in via /sign-up/email).
 * If a member row already exists for this auth_id, returns it
 * idempotently (safe to retry).
 */
const schema = z.object({
  nameEn: z.string().min(1).max(80),
  nameUr: z.string().max(80).optional(),
  phone: z.string().max(30).optional(),
  monthlyPledge: z.number().int().min(0).max(1_000_000).optional(),
  city: z.string().max(60).optional(),
  province: z.string().max(40).optional(),
  fatherName: z.string().max(80).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authUser = await getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Idempotent: if a member row already exists for this auth user,
    // return it instead of creating a duplicate (and 409-ing).
    const [existing] = await db
      .select()
      .from(members)
      .where(eq(members.authId, authUser.id))
      .limit(1);
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const body = await req.json();
    const data = schema.parse(body);

    // Derive username from email prefix; collisions are extremely
    // unlikely with the email→prefix mapping but disambiguate just in
    // case (admin import + mobile signup with same prefix).
    const emailPrefix = authUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = emailPrefix || `user${Date.now()}`;
    for (let i = 1; i < 10; i++) {
      const [clash] = await db.select({ id: members.id }).from(members).where(eq(members.username, username)).limit(1);
      if (!clash) break;
      username = `${emailPrefix}${i + 1}`;
    }

    const [created] = await db
      .insert(members)
      .values({
        authId: authUser.id,
        username,
        nameEn: data.nameEn,
        nameUr: data.nameUr || data.nameEn,
        fatherName: data.fatherName?.trim() || '—',
        phone: data.phone,
        city: data.city,
        province: data.province,
        monthlyPledge: data.monthlyPledge ?? 1000,
        status: 'pending',
        role: 'member',
      })
      .returning();

    await db.insert(auditLog).values({
      actorId: created.id,
      action: 'member-added',
      detail: `Mobile signup: ${data.nameEn} (${authUser.email}) — awaiting approval`,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

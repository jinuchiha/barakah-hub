'use server';
import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, memberInvites, auditLog } from '@/lib/db/schema';
import { sendWelcomeEmail } from '@/lib/email';

const schema = z.object({
  nameEn: z.string().min(2).max(80),
  nameUr: z.string().max(80).optional(),
  fatherName: z.string().min(2).max(80),
  relation: z.string().max(80).optional(),
  phone: z.string().min(7).max(30),
  city: z.string().min(2).max(60),
  province: z.string().min(2).max(40),
  inviteToken: z.string().max(40).optional(),
});

/**
 * Onboard a newly authenticated user — creates the linked `members` row OR
 * updates an imported one (auth_id null) by claiming via username==email.
 *
 * Identity is derived from the cookie session, never the request body, to
 * prevent claiming another user's pre-imported member record.
 */
export async function onboardSelf(input: z.infer<typeof schema>) {
  const session = await getSession();
  if (!session?.user?.email) throw new Error('Not authenticated');

  const user = session.user;
  const data = schema.parse(input);
  const username = user.email.split('@')[0].toLowerCase();

  const existingByAuth = await db.select().from(members).where(eq(members.authId, user.id)).limit(1);
  if (existingByAuth.length > 0) {
    throw new Error('Account already onboarded');
  }

  // Existing record (claim flow for legacy-imported members)
  const [byUsername] = await db.select().from(members).where(eq(members.username, username)).limit(1);
  if (byUsername && !byUsername.authId) {
    if (byUsername.role === 'admin') {
      throw new Error('Admin records cannot be self-claimed — contact existing admin');
    }
    await db
      .update(members)
      .set({
        authId: user.id,
        nameEn: data.nameEn,
        nameUr: data.nameUr || data.nameEn,
        fatherName: data.fatherName,
        relation: data.relation,
        phone: data.phone,
        city: data.city,
        province: data.province,
        needsSetup: false,
      })
      .where(eq(members.id, byUsername.id));
    await db.insert(auditLog).values({
      actorId: byUsername.id,
      action: 'setup-complete',
      detail: `Claimed account ${username}`,
    });
    revalidatePath('/dashboard');
    return;
  }

  // Brand-new user — ensure username is unique (email prefix can collide)
  let finalUsername = username;
  const [existing] = await db.select({ id: members.id }).from(members).where(eq(members.username, username)).limit(1);
  if (existing) {
    // Append last 4 chars of auth id to break the collision deterministically
    finalUsername = `${username}_${user.id.slice(-4)}`;
  }

  // Bootstrap: if there are no admins yet, the first user IS the admin —
  // auto-approved and elevated. This removes the chicken-and-egg of
  // needing an existing admin to approve the founding admin.
  const adminCount = await db.$count(members, eq(members.role, 'admin'));
  const isFounder = adminCount === 0;

  // Validate invite token (if provided) — only consume it on successful insert
  let validInvite: { id: string; maxUses: number; usedCount: number } | null = null;
  if (data.inviteToken) {
    const [inv] = await db.select({ id: memberInvites.id, maxUses: memberInvites.maxUses, usedCount: memberInvites.usedCount, revoked: memberInvites.revoked, expiresAt: memberInvites.expiresAt })
      .from(memberInvites)
      .where(eq(memberInvites.token, data.inviteToken))
      .limit(1);
    if (inv && !inv.revoked && (!inv.expiresAt || inv.expiresAt > new Date()) && inv.usedCount < inv.maxUses) {
      validInvite = { id: inv.id, maxUses: inv.maxUses, usedCount: inv.usedCount };
    }
  }

  const [created] = await db
    .insert(members)
    .values({
      authId: user.id,
      username: finalUsername,
      nameEn: data.nameEn,
      nameUr: data.nameUr || data.nameEn,
      fatherName: data.fatherName,
      relation: data.relation,
      phone: data.phone,
      city: data.city,
      province: data.province,
      role: isFounder ? 'admin' : 'member',
      status: isFounder ? 'approved' : 'pending',
      needsSetup: false,
    })
    .returning();
  await db.insert(auditLog).values({
    actorId: created.id,
    action: 'setup-complete',
    detail: `Self-registered as ${username}`,
  });

  // Atomically increment the invite usedCount (race-safe via WHERE clause).
  if (validInvite) {
    await db
      .update(memberInvites)
      .set({ usedCount: sql`${memberInvites.usedCount} + 1` })
      .where(eq(memberInvites.id, validInvite.id));
  }

  // Welcome email — fire and forget, don't block onboarding on email failure.
  if (user.email) {
    void sendWelcomeEmail(user.email, data.nameEn).catch(() => {});
  }

  revalidatePath('/dashboard');
}

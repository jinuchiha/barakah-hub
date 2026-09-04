'use server';
import { revalidatePath } from 'next/cache';
import { and, eq, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, memberInvites, auditLog, users } from '@/lib/db/schema';
import { sendWelcomeEmail } from '@/lib/email';
import { notifyMembers, adminIds, alertAdminsNewMember } from '@/lib/notify';
import { runAfterResponse } from '@/lib/after-response';

const schema = z.object({
  nameEn: z.string().min(2).max(80),
  nameUr: z.string().max(80).optional(),
  fatherName: z.string().min(2).max(80),
  fatherDeceased: z.boolean().optional(),
  relation: z.string().max(80).optional(),
  phone: z.string().min(7).max(30),
  city: z.string().min(2).max(60),
  province: z.string().min(2).max(40),
  inviteToken: z.string().max(40).optional(),
});

/**
 * Onboard a newly authenticated user · creates the linked `members` row OR
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
      throw new Error('Admin records cannot be self-claimed · contact existing admin');
    }
    // Security: claiming a pre-imported record links credentials to an
    // already-approved identity purely by email-prefix === username. To stop
    // an outsider taking over an approved member, a claim drops the record to
    // `pending` so an admin re-confirms before it's active again.
    await db
      .update(members)
      .set({
        authId: user.id,
        nameEn: data.nameEn,
        nameUr: data.nameUr || data.nameEn,
        fatherName: data.fatherName,
        fatherDeceased: data.fatherDeceased ?? false,
        relation: data.relation,
        phone: data.phone,
        city: data.city,
        province: data.province,
        needsSetup: false,
        status: 'pending',
      })
      .where(eq(members.id, byUsername.id));
    // Username login: mirror the member username onto the auth user.
    await db.update(users).set({ username: byUsername.username.toLowerCase(), displayUsername: byUsername.username }).where(eq(users.id, user.id));
    await db.insert(auditLog).values({
      actorId: byUsername.id,
      action: 'account-claimed',
      detail: `Claimed account ${username} · awaiting admin re-approval`,
    });
    await notifyMembers(
      await adminIds(byUsername.id),
      {
        titleEn: 'Account claim to review', titleUr: 'اکاؤنٹ کلیم برائے جائزہ',
        en: `${data.nameEn} claimed the member record "${username}" · confirm it's really them before approving.`,
        ur: `${data.nameUr || data.nameEn} نے "${username}" کا ریکارڈ کلیم کیا · منظوری سے پہلے تصدیق کریں۔`,
        type: 'member-pending',
      },
      { title: '👤 Account claim to review', body: data.nameEn, data: { type: 'member-pending' }, channelId: 'admin' },
    );
    runAfterResponse('onboarding.alertAdmins', () => alertAdminsNewMember(data.nameEn));
    revalidatePath('/dashboard');
    return;
  }

  // Brand-new user · ensure username is unique (email prefix can collide)
  let finalUsername = username;
  const [existing] = await db.select({ id: members.id }).from(members).where(eq(members.username, username)).limit(1);
  if (existing) {
    // Append last 4 chars of auth id to break the collision deterministically
    finalUsername = `${username}_${user.id.slice(-4)}`;
  }
  // Username login: mirror the chosen username onto the auth user.
  await db.update(users).set({ username: finalUsername.toLowerCase(), displayUsername: finalUsername }).where(eq(users.id, user.id));

  // Bootstrap: if there are no admins yet, the first user IS the admin —
  // auto-approved and elevated. This removes the chicken-and-egg of
  // needing an existing admin to approve the founding admin.
  const adminCount = await db.$count(members, eq(members.role, 'admin'));
  const isFounder = adminCount === 0;

  // Validate invite token (if provided) · only consume it on successful insert
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
      fatherDeceased: data.fatherDeceased ?? false,
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

  // Atomically increment the invite usedCount · the usedCount < maxUses
  // condition makes concurrent signups unable to exceed the cap.
  if (validInvite) {
    await db
      .update(memberInvites)
      .set({ usedCount: sql`${memberInvites.usedCount} + 1` })
      .where(and(eq(memberInvites.id, validInvite.id), lt(memberInvites.usedCount, memberInvites.maxUses)));
  }

  // Welcome email · never block onboarding on email delivery.
  const welcomeEmail = user.email;
  if (welcomeEmail) {
    runAfterResponse('onboarding.welcomeEmail', () => sendWelcomeEmail(welcomeEmail, data.nameEn));
  }

  // Notify admins of a pending member (founders are auto-approved → skip).
  if (!isFounder) {
    await notifyMembers(
      await adminIds(created.id),
      {
        titleEn: 'New member to approve', titleUr: 'نیا رکن برائے منظوری',
        en: `${data.nameEn} signed up and is awaiting your approval.`,
        ur: `${data.nameUr || data.nameEn} نے سائن اپ کیا اور آپ کی منظوری کا منتظر ہے۔`,
        type: 'member-pending',
      },
      { title: '👤 New member to approve', body: data.nameEn, data: { type: 'member-pending' }, channelId: 'admin' },
    );
    void alertAdminsNewMember(data.nameEn).catch((err) => { console.error('[notify] new member alert:', err); });
  }

  revalidatePath('/dashboard');
}

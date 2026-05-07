'use server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { members, auditLog } from '@/lib/db/schema';

const schema = z.object({
  authId: z.string().uuid(),
  email: z.string().email(),
  nameEn: z.string().min(2).max(80),
  nameUr: z.string().max(80).optional(),
  fatherName: z.string().min(2).max(80),
  relation: z.string().max(80).optional(),
  phone: z.string().min(7).max(30),
  city: z.string().min(2).max(60),
  province: z.string().min(2).max(40),
});

/**
 * Onboard a newly authenticated user — creates the linked `members` row OR
 * updates an imported one (auth_id null) by claiming via username==email.
 */
export async function onboardSelf(input: z.infer<typeof schema>) {
  const data = schema.parse(input);
  const username = data.email.split('@')[0].toLowerCase();

  // Existing record (claim flow for legacy-imported members)
  const [byUsername] = await db.select().from(members).where(eq(members.username, username)).limit(1);
  if (byUsername && !byUsername.authId) {
    await db
      .update(members)
      .set({
        authId: data.authId,
        nameEn: data.nameEn,
        nameUr: data.nameUr || data.nameEn,
        fatherName: data.fatherName,
        relation: data.relation,
        phone: data.phone,
        city: data.city,
        province: data.province,
        needsSetup: false,
        status: 'approved',
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

  // Brand-new user — first signup
  const [created] = await db
    .insert(members)
    .values({
      authId: data.authId,
      username,
      nameEn: data.nameEn,
      nameUr: data.nameUr || data.nameEn,
      fatherName: data.fatherName,
      relation: data.relation,
      phone: data.phone,
      city: data.city,
      province: data.province,
      role: 'member',
      status: 'pending',
      needsSetup: false,
    })
    .returning();
  await db.insert(auditLog).values({
    actorId: created.id,
    action: 'setup-complete',
    detail: `Self-registered as ${username}`,
  });
  revalidatePath('/dashboard');
}

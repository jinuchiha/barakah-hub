'use server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, notifications, auditLog } from '@/lib/db/schema';

const schema = z.object({
  titleUr: z.string().max(120).optional(),
  titleEn: z.string().min(1).max(120),
  ur: z.string().min(1).max(500),
  en: z.string().min(1).max(500),
  type: z.enum(['info', 'urgent', 'payment']).default('info'),
});

export async function broadcastNotification(input: z.infer<typeof schema>) {
  const me = await meOrThrow();
  if (me.role !== 'admin') throw new Error('Admin only');
  const data = schema.parse(input);

  const recipients = await db.select({ id: members.id }).from(members).where(eq(members.deceased, false));
  if (recipients.length === 0) return;

  await db.insert(notifications).values(
    recipients.map((r) => ({
      recipientId: r.id,
      titleUr: data.titleUr ?? data.titleEn,
      titleEn: data.titleEn,
      ur: data.ur,
      en: data.en,
      type: data.type,
    })),
  );
  await db.insert(auditLog).values({
    actorId: me.id,
    action: 'broadcast',
    detail: `Broadcast to ${recipients.length} members: ${data.titleEn.slice(0, 80)}`,
  });
  revalidatePath('/notifications');
}

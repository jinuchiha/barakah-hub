'use server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { members, notifications, auditLog } from '@/lib/db/schema';

const schema = z.object({
  ur: z.string().min(1).max(500),
  en: z.string().min(1).max(500),
  type: z.string().max(40).default('info'),
});

export async function broadcastNotification(input: z.infer<typeof schema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const [me] = await db.select().from(members).where(eq(members.authId, user.id)).limit(1);
  if (!me || me.role !== 'admin') throw new Error('Admin only');
  const data = schema.parse(input);

  const recipients = await db.select({ id: members.id }).from(members).where(eq(members.deceased, false));
  if (recipients.length === 0) return;

  await db.insert(notifications).values(
    recipients.map((r) => ({ recipientId: r.id, ur: data.ur, en: data.en, type: data.type })),
  );
  await db.insert(auditLog).values({
    actorId: me.id,
    action: 'broadcast',
    detail: `Broadcast to ${recipients.length} members: ${data.en.slice(0, 80)}`,
  });
  revalidatePath('/notifications');
}

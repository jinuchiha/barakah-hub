import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { members, notifications } from '@/lib/db/schema';
import { sendPushToMembers, type PushPayload } from '@/lib/push';

export interface NotifContent {
  titleEn: string;
  titleUr: string;
  en: string;
  ur: string;
  type: string;
}

/** In-app notification (one row per recipient) + optional push. Push is
 *  fire-and-forget so delivery never blocks the caller. */
export async function notifyMembers(
  recipientIds: string[],
  n: NotifContent,
  push?: PushPayload,
): Promise<void> {
  if (recipientIds.length === 0) return;
  await db.insert(notifications).values(
    recipientIds.map((id) => ({
      recipientId: id, titleEn: n.titleEn, titleUr: n.titleUr, en: n.en, ur: n.ur, type: n.type,
    })),
  );
  if (push) void sendPushToMembers(recipientIds, push).catch(() => {});
}

/** Approved, living members who can act on fund approvals (admins +
 *  supervisors), excluding the actor. */
export async function fundApproverIds(excludeId?: string): Promise<string[]> {
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(and(
      eq(members.deceased, false),
      eq(members.status, 'approved'),
      inArray(members.role, ['admin', 'supervisor']),
    ));
  return rows.filter((r) => r.id !== excludeId).map((r) => r.id);
}

/** Approved, living admins, excluding the actor. */
export async function adminIds(excludeId?: string): Promise<string[]> {
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(and(
      eq(members.deceased, false),
      eq(members.status, 'approved'),
      eq(members.role, 'admin'),
    ));
  return rows.filter((r) => r.id !== excludeId).map((r) => r.id);
}

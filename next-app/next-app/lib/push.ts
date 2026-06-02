import { db } from '@/lib/db';
import { pushTokens } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Server-side Expo push delivery.
 *
 * Uses Expo's free push gateway at https://exp.host. Tokens are bound
 * to members in the `push_tokens` table; this module looks them up by
 * memberId, batches the request, and silently drops invalid tokens.
 *
 * No external SDK — Expo's API is a plain HTTPS POST.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: 'payments' | 'cases' | 'messages' | 'admin';
}

export async function sendPushToMembers(memberIds: string[], payload: PushPayload): Promise<{ sent: number; invalid: number }> {
  if (memberIds.length === 0) return { sent: 0, invalid: 0 };

  const tokens = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(inArray(pushTokens.memberId, memberIds));

  if (tokens.length === 0) return { sent: 0, invalid: 0 };

  const messages = tokens.map((t) => ({
    to: t.token,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    channelId: payload.channelId ?? 'default',
    sound: 'default',
    priority: 'high',
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const json = await res.json() as { data?: Array<{ status: 'ok' | 'error'; details?: { error?: string } }> };

    let invalid = 0;
    const tokensToRemove: string[] = [];
    json.data?.forEach((tick, i) => {
      if (tick.status === 'error') {
        invalid++;
        // DeviceNotRegistered means the user uninstalled — clean up.
        if (tick.details?.error === 'DeviceNotRegistered') {
          tokensToRemove.push(tokens[i].token);
        }
      }
    });
    if (tokensToRemove.length > 0) {
      await db.delete(pushTokens).where(inArray(pushTokens.token, tokensToRemove));
    }
    return { sent: messages.length - invalid, invalid };
  } catch (err) {
    console.warn('[push] expo send failed', err);
    return { sent: 0, invalid: messages.length };
  }
}

/** Convenience: push to ALL approved members except the actor. */
export async function broadcastPush(actorId: string, payload: PushPayload) {
  const { members } = await import('@/lib/db/schema');
  const { and, ne, eq: eqOp } = await import('drizzle-orm');
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eqOp(members.status, 'approved'), eqOp(members.deceased, false), ne(members.id, actorId)));
  return sendPushToMembers(rows.map((r) => r.id), payload);
}

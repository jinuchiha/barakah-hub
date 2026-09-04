import { db } from '@/lib/db';
import { pushTokens } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

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

/** Expo rejects a request carrying more than 100 messages. */
const EXPO_MAX_BATCH = 100;
/** Expo's gateway is not part of the request path — never let it hang one. */
const EXPO_TIMEOUT_MS = 10_000;

/**
 * Deliver a push to every device registered to the given members.
 *
 * Two defects this replaces:
 *
 *  · The previous version never checked `res.ok`. When Expo answered with an
 *    error envelope, `json.data` was undefined, the receipt loop never ran,
 *    and the function returned `{ sent: messages.length, invalid: 0 }` — a
 *    full success report for a total failure. The one signal that could have
 *    revealed broken push was hard-coded to say everything was fine.
 *
 *  · It posted every token in a single request, so any broadcast to more than
 *    100 registered devices was rejected wholesale.
 *
 * Returns honest counts. `failed` is non-zero whenever delivery could not be
 * confirmed, so callers and logs can distinguish "nobody to notify" from
 * "notification lost".
 */
export async function sendPushToMembers(
  memberIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; invalid: number; failed: number }> {
  if (memberIds.length === 0) return { sent: 0, invalid: 0, failed: 0 };

  const tokens = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(inArray(pushTokens.memberId, memberIds));

  if (tokens.length === 0) return { sent: 0, invalid: 0, failed: 0 };

  let sent = 0;
  let invalid = 0;
  let failed = 0;
  const tokensToRemove: string[] = [];

  for (let i = 0; i < tokens.length; i += EXPO_MAX_BATCH) {
    const batch = tokens.slice(i, i + EXPO_MAX_BATCH);
    const messages = batch.map((t) => ({
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
        signal: AbortSignal.timeout(EXPO_TIMEOUT_MS),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        console.error(`[push] expo rejected batch: ${res.status} ${detail.slice(0, 200)}`);
        failed += batch.length;
        continue;
      }

      const json = (await res.json()) as {
        data?: Array<{ status: 'ok' | 'error'; details?: { error?: string } }>;
      };

      // A 200 with no receipt array means we cannot confirm anything.
      if (!Array.isArray(json.data)) {
        console.error('[push] expo returned no receipt array; delivery unconfirmed');
        failed += batch.length;
        continue;
      }

      json.data.forEach((tick, idx) => {
        if (tick.status === 'ok') {
          sent++;
          return;
        }
        invalid++;
        // DeviceNotRegistered means the user uninstalled — clean up.
        if (tick.details?.error === 'DeviceNotRegistered' && batch[idx]) {
          tokensToRemove.push(batch[idx].token);
        }
      });

      // Expo should return one receipt per message; if it returned fewer,
      // the remainder is unconfirmed rather than delivered.
      if (json.data.length < batch.length) {
        failed += batch.length - json.data.length;
      }
    } catch (err) {
      console.error('[push] expo send failed:', err instanceof Error ? err.message : err);
      failed += batch.length;
    }
  }

  if (tokensToRemove.length > 0) {
    await db.delete(pushTokens).where(inArray(pushTokens.token, tokensToRemove));
  }

  if (failed > 0) {
    console.error(`[push] ${failed}/${tokens.length} notifications could not be delivered ("${payload.title}")`);
  }
  return { sent, invalid, failed };
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

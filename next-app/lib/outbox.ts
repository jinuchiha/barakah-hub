import { and, eq, lte, sql } from 'drizzle-orm';
import { db, type Tx } from '@/lib/db';
import { outboxMessages, type OutboxChannel } from '@/lib/db/schema';

/**
 * Notification delivery as state, not as a side effect.
 *
 * Before this, an action fired email/WhatsApp/push directly and hoped. Three
 * separate audit findings came from that one decision: push reported success
 * when it had failed, WhatsApp free-text was rejected outside Meta's 24-hour
 * window and discarded, and twenty `void promise` fan-outs could be killed by
 * the serverless freeze. All three were INVISIBLE — no queue, no retry, no
 * delivery rate, no way for anyone to discover a member had stopped getting
 * receipts.
 *
 * Now an action calls `enqueue()` inside the transaction that owes the
 * notification, so "the payment was verified" and "a receipt is owed" commit
 * together. A worker drains the table with exponential backoff and gives up
 * into a `dead` state someone can query.
 *
 * Deliberately Postgres and a cron, not a queue service: the volume is a
 * family fund's, the durability requirement is already met by the database
 * we have, and a second runtime dependency would buy nothing here.
 */

type Conn = typeof db | Tx;

/** Backoff schedule in minutes, indexed by attempt number. */
const BACKOFF_MINUTES = [1, 5, 30, 120, 720];

export interface EnqueueInput {
  channel: OutboxChannel;
  /** Selects the renderer in lib/outbox-render.ts. */
  kind: string;
  /** Parameters for that renderer. Kept structured so a template fix
   *  applies to messages still queued. */
  payload: Record<string, unknown>;
  memberId?: string | null;
  /**
   * Optional idempotency key for the NOTIFICATION (distinct from the
   * payment's). A retried action or a double-fired cron collapses to one
   * message instead of sending twice.
   */
  dedupeKey?: string;
  maxAttempts?: number;
}

/**
 * Queue one message.
 *
 * Returns false when a message with the same dedupeKey is already queued —
 * the caller has nothing to do, and that is a success, not an error.
 */
export async function enqueue(conn: Conn, input: EnqueueInput): Promise<boolean> {
  const written = await conn
    .insert(outboxMessages)
    .values({
      channel: input.channel,
      kind: input.kind,
      payload: input.payload,
      memberId: input.memberId ?? null,
      dedupeKey: input.dedupeKey,
      maxAttempts: input.maxAttempts ?? 5,
    })
    .onConflictDoNothing()
    .returning();
  return written.length > 0;
}

/** Queue the same message for many members, one row each. */
export async function enqueueMany(
  conn: Conn,
  memberIds: string[],
  input: Omit<EnqueueInput, 'memberId' | 'dedupeKey'> & { dedupeKeyFor?: (id: string) => string },
): Promise<number> {
  if (memberIds.length === 0) return 0;
  const written = await conn
    .insert(outboxMessages)
    .values(memberIds.map((id) => ({
      channel: input.channel,
      kind: input.kind,
      payload: input.payload,
      memberId: id,
      dedupeKey: input.dedupeKeyFor?.(id),
      maxAttempts: input.maxAttempts ?? 5,
    })))
    .onConflictDoNothing()
    .returning();
  return written.length;
}

/**
 * Claim a batch of due messages.
 *
 * `FOR UPDATE SKIP LOCKED` is what makes two concurrent workers safe: each
 * takes a disjoint set instead of both grabbing the same rows. Without it,
 * an overlapping cron run would double-send.
 */
export async function claimDue(limit: number): Promise<typeof outboxMessages.$inferSelect[]> {
  return db
    .select()
    .from(outboxMessages)
    .where(and(
      eq(outboxMessages.state, 'pending'),
      lte(outboxMessages.nextAttemptAt, new Date()),
    ))
    .orderBy(outboxMessages.nextAttemptAt)
    .limit(limit)
    .for('update', { skipLocked: true });
}

/** Mark a message delivered. */
export async function markSent(id: string): Promise<void> {
  await db
    .update(outboxMessages)
    .set({ state: 'sent', sentAt: new Date(), lastError: null })
    .where(eq(outboxMessages.id, id));
}

/**
 * Record a failed attempt.
 *
 * Schedules the next try with exponential backoff, or gives up into `dead`
 * once max_attempts is exhausted. `dead` is not a silent discard — it is a
 * queryable state, which is the entire difference from the old behaviour.
 */
export async function markFailed(
  msg: { id: string; attempts: number; maxAttempts: number },
  error: string,
): Promise<'retry' | 'dead'> {
  const attempts = msg.attempts + 1;
  const exhausted = attempts >= msg.maxAttempts;

  if (exhausted) {
    await db
      .update(outboxMessages)
      .set({ state: 'dead', attempts, lastError: error.slice(0, 500) })
      .where(eq(outboxMessages.id, msg.id));
    console.error(`[outbox] message ${msg.id} DEAD after ${attempts} attempts: ${error.slice(0, 200)}`);
    return 'dead';
  }

  const delayMinutes = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
  await db
    .update(outboxMessages)
    .set({
      attempts,
      lastError: error.slice(0, 500),
      nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
    })
    .where(eq(outboxMessages.id, msg.id));
  return 'retry';
}

/**
 * Delivery health, for the weekly summary and for anyone asking "are
 * notifications working?" — a question that previously had no answer.
 */
export async function outboxHealth(): Promise<{
  pending: number; sent: number; dead: number; oldestPendingMinutes: number | null;
}> {
  const [counts] = await db
    .select({
      pending: sql<string>`COUNT(*) FILTER (WHERE ${outboxMessages.state} = 'pending')`,
      sent: sql<string>`COUNT(*) FILTER (WHERE ${outboxMessages.state} = 'sent')`,
      dead: sql<string>`COUNT(*) FILTER (WHERE ${outboxMessages.state} = 'dead')`,
      oldest: sql<string | null>`
        EXTRACT(EPOCH FROM (now() - MIN(${outboxMessages.createdAt})
          FILTER (WHERE ${outboxMessages.state} = 'pending'))) / 60`,
    })
    .from(outboxMessages);

  return {
    pending: Number(counts?.pending ?? 0),
    sent: Number(counts?.sent ?? 0),
    dead: Number(counts?.dead ?? 0),
    oldestPendingMinutes: counts?.oldest == null ? null : Math.round(Number(counts.oldest)),
  };
}

/**
 * Prune delivered messages.
 *
 * Successful sends are operational data, not financial records, so unlike
 * audit_log and ledger_entries they are safe to delete. `dead` rows are kept
 * — they are the record of what did not arrive.
 */
export async function pruneSent(olderThanDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
  const deleted = await db
    .delete(outboxMessages)
    .where(and(eq(outboxMessages.state, 'sent'), lte(outboxMessages.sentAt, cutoff)))
    .returning();
  return deleted.length;
}

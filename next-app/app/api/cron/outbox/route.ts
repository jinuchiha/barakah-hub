import { NextResponse } from 'next/server';
import { claimDue, markSent, markFailed, outboxHealth, pruneSent } from '@/lib/outbox';
import { deliver } from '@/lib/outbox-deliver';
import { recordHeartbeat } from '@/lib/cron-heartbeat';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Drains a batch per run and stops well inside the limit; a large backlog is
// worked off over successive runs rather than by one long invocation that
// risks being killed mid-flight.
export const maxDuration = 300;

/**
 * Notification delivery worker.
 *
 * Actions no longer send email/WhatsApp/push themselves — they write a row
 * inside the transaction that owes the notification. This drains that queue.
 *
 * What that buys, none of which existed before:
 *   · Retries with exponential backoff instead of one silent attempt.
 *   · A `dead` state for what genuinely cannot be delivered, so "the member
 *     never got their receipt" becomes a query rather than a mystery.
 *   · Immunity to the serverless freeze: the intent is durable, so losing
 *     the instance mid-send costs a retry, not the message.
 *   · A delivery rate. `/api/cron/outbox` returns one, and the weekly
 *     summary reports it.
 *
 * Runs every 5 minutes (vercel.json). Safe to run concurrently: claimDue
 * uses FOR UPDATE SKIP LOCKED, so two overlapping runs take disjoint work.
 */

/** Bounded per run so one invocation cannot run past its own timeout. */
const BATCH_SIZE = 50;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  // Fail closed, as every other cron endpoint does.
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const due = await claimDue(BATCH_SIZE);

  let sent = 0;
  let retrying = 0;
  let dead = 0;

  // Sequential on purpose. These are third-party HTTP calls against
  // providers with their own rate limits, and the queue is drained by the
  // NEXT run anyway — there is nothing to gain from hammering Resend or
  // Meta in parallel, and something to lose.
  for (const msg of due) {
    try {
      const result = await deliver(msg);

      if (result.delivered) {
        await markSent(msg.id);
        sent++;
        continue;
      }

      // A permanent failure will fail identically forever, so retrying it
      // just churns. Exhaust it immediately into `dead`, where it reads as
      // something to FIX rather than something to wait for.
      if (result.permanentFailure) {
        await markFailed(
          { id: msg.id, attempts: msg.maxAttempts - 1, maxAttempts: msg.maxAttempts },
          result.permanentFailure,
        );
        dead++;
        continue;
      }

      const outcome = await markFailed(msg, 'Delivery reported not delivered, no reason given');
      if (outcome === 'dead') dead++; else retrying++;
    } catch (err) {
      const outcome = await markFailed(msg, err instanceof Error ? err.message : String(err));
      if (outcome === 'dead') dead++; else retrying++;
    }
  }

  // Housekeeping, cheap and only when there is nothing urgent queued.
  let pruned = 0;
  if (due.length < BATCH_SIZE) {
    pruned = await pruneSent(30);
  }

  const health = await outboxHealth();

  // A non-zero `dead` count means members are silently not receiving
  // notifications — most likely a missing WHATSAPP_TEMPLATE_* or
  // RESEND_API_KEY. Raised through Sentry so it becomes an alert someone
  // sees, not a log line nobody reads. Counts only — no recipient data.
  if (health.dead > 0) {
    console.error(`[outbox] ${health.dead} message(s) in dead state — investigate`);
    Sentry.captureMessage(`Outbox has ${health.dead} dead notification(s)`, 'error');
  }
  if (health.oldestPendingMinutes !== null && health.oldestPendingMinutes > 60) {
    Sentry.captureMessage(
      `Outbox backlog stalled: oldest pending message is ${health.oldestPendingMinutes} minutes old`,
      'error',
    );
  }

  // Liveness ledger — /api/health flags this heartbeat going stale, which is
  // the ONLY way a wrong CRON_SECRET (perpetual 401, this handler never
  // runs) becomes visible.
  await recordHeartbeat('outbox', dead > 0 ? 'error' : 'ok', `sent=${sent} retry=${retrying} dead=${dead}`);

  return NextResponse.json({
    ok: true,
    processed: due.length,
    sent,
    retrying,
    dead,
    pruned,
    health,
  });
}

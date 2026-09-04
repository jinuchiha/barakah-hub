import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { outboxHealth } from '@/lib/outbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Uptime probe, and the one place that answers "is production healthy?".
 *
 * Deliberately two levels:
 *
 *  · The default response stays what an uptime monitor wants — cheap, no
 *    auth, no data, 200 or 503 on whether the database answers. dbHost names
 *    WHICH Neon endpoint serves production (hostname only, never credentials)
 *    so a misconfigured deploy is visible.
 *
 *  · `?deep=1` adds latency and notification-delivery health. This is the
 *    check worth alerting on: a growing outbox backlog or a non-zero dead
 *    count means members have stopped receiving receipts, which is invisible
 *    from the outside. Still unauthenticated, because it exposes only
 *    counts and timings — no member data.
 */
export async function GET(req: Request) {
  const dbHost = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? '').hostname;
    } catch {
      return null;
    }
  })();

  const deep = new URL(req.url).searchParams.get('deep') === '1';

  const started = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    return NextResponse.json(
      { ok: false, db: false, dbHost, dbLatencyMs: Date.now() - started },
      { status: 503 },
    );
  }
  const dbLatencyMs = Date.now() - started;

  if (!deep) {
    return NextResponse.json({ ok: true, db: true, dbHost, dbLatencyMs });
  }

  const notifications = await outboxHealth().catch(() => null);

  // A backlog older than an hour means the drain has stopped, not that it is
  // busy — the cron runs every 5 minutes.
  const notificationsStalled =
    notifications !== null
    && (notifications.dead > 0
      || (notifications.oldestPendingMinutes !== null && notifications.oldestPendingMinutes > 60));

  return NextResponse.json(
    {
      ok: !notificationsStalled,
      db: true,
      dbHost,
      dbLatencyMs,
      notifications,
      // Named so an alert rule can key on it rather than parsing prose.
      degraded: notificationsStalled ? ['notifications'] : [],
      release: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    },
    { status: notificationsStalled ? 503 : 200 },
  );
}

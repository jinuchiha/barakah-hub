import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { outboxHealth } from '@/lib/outbox';
import { heartbeatAgeMinutes } from '@/lib/cron-heartbeat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Uptime probe, and the one place that answers "is production healthy?".
 *
 * Three levels:
 *
 *  · Default — what an uptime monitor pings: cheap, no auth, no data.
 *    200/503 on whether the database answers. Nothing else.
 *
 *  · `?deep=1` — adds the checks worth alerting on, still unauthenticated
 *    but exposing only booleans and the degraded list: outbox backlog /
 *    dead letters, and a stale outbox-cron heartbeat (the signature of a
 *    wrong CRON_SECRET: every run 401s, nothing crashes, notifications
 *    silently stop). Monitors alert on the 503 status code alone.
 *
 *  · `?deep=1` + key — full diagnostic detail (dbHost, latency, counts,
 *    release). The key is HEALTH_CHECK_KEY, falling back to CRON_SECRET,
 *    sent as `Authorization: Bearer <key>` or `?key=<key>`. Infrastructure
 *    hostnames and deploy SHAs are reconnaissance data; they no longer go
 *    to anonymous callers.
 */

// The outbox drain runs every 5 minutes, but from GitHub Actions rather
// than Vercel cron (Hobby refuses sub-daily expressions — see
// .github/workflows/outbox-drain.yml). GitHub's scheduler is best-effort
// and runs late under load, sometimes by 10-20 minutes, so 15 here would
// flap between ok and degraded for no reason. 30 still catches a drain
// that has actually stopped, which is what this is for.
const OUTBOX_HEARTBEAT_STALE_MINUTES = 30;

function hasDiagnosticKey(req: Request): boolean {
  const expected = process.env.HEALTH_CHECK_KEY || process.env.CRON_SECRET;
  if (!expected) return false;
  const bearer = req.headers.get('authorization');
  if (bearer === `Bearer ${expected}`) return true;
  return new URL(req.url).searchParams.get('key') === expected;
}

export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get('deep') === '1';

  const started = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }
  const dbLatencyMs = Date.now() - started;

  if (!deep) {
    return NextResponse.json({ ok: true, db: true });
  }

  const [notifications, outboxCronAge] = await Promise.all([
    outboxHealth().catch(() => null),
    heartbeatAgeMinutes('outbox').catch(() => null),
  ]);

  // A backlog older than an hour means the drain has stopped, not that it
  // is busy — the cron runs every 5 minutes.
  const notificationsStalled =
    notifications !== null
    && (notifications.dead > 0
      || (notifications.oldestPendingMinutes !== null && notifications.oldestPendingMinutes > 60));

  // Never ran (fresh deploy before first tick) reads as stale after the
  // table exists — that is correct: it should have run within 15 minutes.
  const outboxCronStale = outboxCronAge === null || outboxCronAge > OUTBOX_HEARTBEAT_STALE_MINUTES;

  const degraded = [
    ...(notificationsStalled ? ['notifications'] : []),
    ...(outboxCronStale ? ['outbox-cron'] : []),
  ];

  const base = { ok: degraded.length === 0, db: true, degraded };

  if (!hasDiagnosticKey(req)) {
    return NextResponse.json(base, { status: base.ok ? 200 : 503 });
  }

  const dbHost = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? '').hostname;
    } catch {
      return null;
    }
  })();

  return NextResponse.json(
    {
      ...base,
      dbHost,
      dbLatencyMs,
      notifications,
      outboxCronAgeMinutes: outboxCronAge,
      release: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    },
    { status: base.ok ? 200 : 503 },
  );
}

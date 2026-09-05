import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cronHeartbeats } from '@/lib/db/schema';

/**
 * Cron liveness. Every scheduled job records a heartbeat at the END of a
 * successful run; the health endpoint turns a stale outbox heartbeat into a
 * 503 an uptime monitor can alert on.
 *
 * This exists because the failure it detects is otherwise invisible: a
 * wrong CRON_SECRET makes Vercel's scheduler receive 401s forever, nothing
 * crashes, no error is logged app-side, and notifications quietly stop.
 */
export type CronJob = 'outbox' | 'reminders' | 'monthly-statements' | 'weekly-backup';

export async function recordHeartbeat(job: CronJob, status: 'ok' | 'error', detail?: string): Promise<void> {
  await db
    .insert(cronHeartbeats)
    .values({ job, lastRunAt: new Date(), lastStatus: status, detail: detail ?? null })
    .onConflictDoUpdate({
      target: cronHeartbeats.job,
      set: { lastRunAt: new Date(), lastStatus: status, detail: detail ?? null },
    });
}

/** Minutes since the job last completed, or null if it never has. */
export async function heartbeatAgeMinutes(job: CronJob): Promise<number | null> {
  const rows = await db
    .select({ age: sql<number>`EXTRACT(EPOCH FROM (now() - ${cronHeartbeats.lastRunAt})) / 60` })
    .from(cronHeartbeats)
    .where(sql`${cronHeartbeats.job} = ${job}`)
    .limit(1);
  if (rows.length === 0) return null;
  return Math.floor(Number(rows[0].age));
}

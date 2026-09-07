import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

// Production served three-day-old code and nothing anywhere said so.
//
// The cause was a cron: `*/5 * * * *` for the outbox drain sat in
// vercel.json, and Vercel's Hobby plan refuses any expression that runs
// more than once a day. It refuses it when the deployment is CREATED —
// before a build exists — so no deployment row appeared, no build log
// existed, and the dashboard showed nothing wrong. Every push to main was
// silently dropped. The error is visible in exactly one place: the manual
// Create Deployment dialog, which is where it was eventually found by
// accident.
//
// The schedule now lives in .github/workflows/outbox-drain.yml, but the
// blind spot is the real defect: a config change that stops every deploy
// should not be able to reach main unnoticed. These checks are cheap and
// would have failed on the commit that introduced it.
//
// They also cover the two neighbouring silent failures — a cron pointing
// at a route that no longer exists, and a cron route nothing ever calls.
// Both fail the same way: nothing happens, forever, quietly.
//
// (Line comments, not a block: the cron expression above ends a block
//  comment at its own `*/`. Not hypothetical — it is how this very file
//  first failed to parse.)

const APP = path.resolve(__dirname, '..');
const REPO = path.resolve(APP, '..');
const WORKFLOWS = path.join(REPO, '.github/workflows');

interface CronEntry {
  path: string;
  schedule: string;
}

const vercelConfig: { crons?: CronEntry[] } = JSON.parse(
  readFileSync(path.join(APP, 'vercel.json'), 'utf8'),
);
const crons = vercelConfig.crons ?? [];

/**
 * True when a five-field cron expression can fire more than once in a day.
 *
 * Only the minute and hour fields decide this. If either is anything but a
 * single concrete number — a wildcard, a step, a list, a range — the job
 * repeats within one day, which is what Hobby rejects. The day-of-month,
 * month and day-of-week fields can only make it rarer, so they do not
 * matter here.
 */
function firesMoreThanDaily(schedule: string): boolean {
  const fields = schedule.trim().split(/\s+/);
  if (fields.length !== 5) return true; // malformed: treat as unsafe
  const [minute, hour] = fields;
  return !/^\d+$/.test(minute) || !/^\d+$/.test(hour);
}

/** Route directories under app/api/cron, as the paths a scheduler calls. */
function cronRoutePaths(): string[] {
  const dir = path.join(APP, 'app/api/cron');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(path.join(dir, e.name, 'route.ts')))
    .map((e) => `/api/cron/${e.name}`);
}

/** Every workflow file as raw text, to see which endpoints they call. */
function workflowText(): string {
  if (!existsSync(WORKFLOWS)) return '';
  return readdirSync(WORKFLOWS)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => readFileSync(path.join(WORKFLOWS, f), 'utf8'))
    .join('\n');
}

describe('firesMoreThanDaily', () => {
  // The predicate the first test depends on, checked directly — otherwise
  // a bug that made it always return false would leave that test green
  // while protecting nothing.
  it('accepts schedules that run at most once a day', () => {
    for (const ok of ['0 9 25 * *', '0 9 1 * *', '0 2 * * 0', '30 0 * * *']) {
      expect(firesMoreThanDaily(ok), ok).toBe(false);
    }
  });

  it('rejects steps, wildcards, lists and ranges in the minute or hour', () => {
    for (const bad of [
      '*/5 * * * *',   // the one that broke deployments
      '0 */6 * * *',   // four times a day
      '* 3 * * *',     // every minute of one hour
      '0 9,17 * * *',  // twice a day
      '0 9-17 * * *',  // hourly through the working day
      '0 9 * *',       // malformed — four fields
    ]) {
      expect(firesMoreThanDaily(bad), bad).toBe(true);
    }
  });
});

describe('vercel.json crons', () => {
  it('never schedules a job more than once a day', () => {
    for (const cron of crons) {
      expect(
        firesMoreThanDaily(cron.schedule),
        `"${cron.schedule}" (${cron.path}) fires more than once a day. Vercel's Hobby `
        + 'plan will refuse to create ANY deployment while this sits in vercel.json, '
        + 'silently — no failed build, no dashboard error, main just stops shipping. '
        + 'Drive it from .github/workflows instead, the way the outbox drain is.',
      ).toBe(false);
    }
  });

  it('uses well-formed five-field expressions', () => {
    for (const cron of crons) {
      expect(cron.schedule.trim().split(/\s+/), `${cron.path}: "${cron.schedule}"`)
        .toHaveLength(5);
    }
  });

  it('points every cron at a route that exists', () => {
    // A cron aimed at a renamed or deleted route 404s on every tick for as
    // long as nobody looks, which is indistinguishable from the job simply
    // having had nothing to do.
    const routes = cronRoutePaths();
    for (const cron of crons) {
      expect(routes, `vercel.json schedules ${cron.path}, but no such route file exists`)
        .toContain(cron.path);
    }
  });
});

describe('cron routes', () => {
  it('has a caller for every cron route', () => {
    // The other direction: a scheduled endpoint nothing invokes. For the
    // outbox that means queued WhatsApp and email are never delivered at
    // all, since `enqueue` writes a row and nothing sends inline.
    const scheduledByVercel = new Set(crons.map((c) => c.path));
    const workflows = workflowText();

    for (const route of cronRoutePaths()) {
      const driven = scheduledByVercel.has(route) || workflows.includes(route);
      expect(
        driven,
        `${route} exists but nothing calls it — absent from vercel.json crons and from `
        + 'every .github/workflows file. A cron endpoint with no caller does nothing, '
        + 'and looks exactly like a cron endpoint with nothing to do.',
      ).toBe(true);
    }
  });

  it('is driven by one scheduler, not two', () => {
    // Two schedulers on one endpoint double the provider calls, and the
    // heartbeat stays fresh even after one of them has broken.
    const workflows = workflowText();
    for (const cron of crons) {
      expect(
        workflows.includes(cron.path),
        `${cron.path} is scheduled in vercel.json AND referenced by a workflow. `
        + 'Pick one — two schedulers double the calls and mask a failure in either.',
      ).toBe(false);
    }
  });
});

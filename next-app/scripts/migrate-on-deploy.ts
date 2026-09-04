/**
 * Deploy-time migration gate.
 *
 * Nothing in the pipeline applied migrations. `vercel.json` ran `pnpm build`
 * and that was it, so the only path to production schema was a human
 * remembering to dispatch the db-maintenance workflow *before* merging.
 * Miss it once and the new code serves traffic against the old schema —
 * every affected query 500s, and (before the Sentry fix) nobody is told.
 *
 * Running here, as part of the production build, means the deployment
 * cannot go live ahead of its schema: if the migration fails the build
 * fails and the current deployment keeps serving. That is the safe
 * direction to fail.
 *
 * Only production. Preview builds must never touch the production database,
 * and their own per-PR Neon branch is already migrated by the
 * neon-pr-branch workflow.
 */
import { spawnSync } from 'node:child_process';

const env = process.env.VERCEL_ENV;

if (env && env !== 'production') {
  console.log(`▶ VERCEL_ENV=${env} — skipping migrations (production only).`);
  process.exit(0);
}

if (!process.env.DATABASE_URL_DIRECT) {
  if (env === 'production') {
    // Fail closed. A production build with no way to migrate is exactly the
    // situation this script exists to prevent.
    console.error(
      '❌ DATABASE_URL_DIRECT is not set in the production build environment.\n' +
      '   Migrations cannot be applied, so this deploy could serve code that\n' +
      '   expects a schema the database does not have.\n' +
      '   Add DATABASE_URL_DIRECT (the non-pooled Neon URL) to the Vercel\n' +
      '   Production environment, or run migrations manually and re-deploy.',
    );
    process.exit(1);
  }
  console.log('▶ Not a Vercel production build and no DATABASE_URL_DIRECT — skipping migrations.');
  process.exit(0);
}

console.log('▶ Production build — applying migrations before the deploy goes live.');
const result = spawnSync('pnpm', ['exec', 'tsx', 'scripts/migrate.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  console.error('❌ Migrations failed — failing the build so the current deployment keeps serving.');
  process.exit(result.status ?? 1);
}

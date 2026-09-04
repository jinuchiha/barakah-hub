import * as Sentry from '@sentry/nextjs';

/**
 * Edge runtime (middleware). Same DSN-resolution fix as
 * sentry.server.config.ts — see the comment there.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
});

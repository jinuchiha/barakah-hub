import * as Sentry from '@sentry/nextjs';

// dsn is undefined when SENTRY_DSN isn't set in Vercel env — Sentry's SDK
// treats that as "disabled" and every call below becomes a no-op.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

import * as Sentry from '@sentry/nextjs';

/**
 * Server-side error reporting.
 *
 * This file used to read `process.env.SENTRY_DSN`, a variable that appears
 * nowhere in `.env.example` — which documents only NEXT_PUBLIC_SENTRY_DSN.
 * An operator following the setup guide therefore got browser errors in
 * Sentry and nothing at all from server actions, the ~60 API routes, or the
 * three cron jobs. Every server-side failure was invisible in production.
 *
 * Accept either name, preferring the server-only one when both are set, so
 * an existing deployment that already set SENTRY_DSN keeps working.
 */
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (!dsn && process.env.NODE_ENV === 'production') {
  // Loud, once, at boot. A missing DSN is a configuration mistake in
  // production, and staying quiet about it is what caused the original bug.
  console.warn(
    '[sentry] No DSN configured (set SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN). ' +
    'Server-side errors will NOT be reported.',
  );
}

Sentry.init({
  dsn,
  tracesSampleRate: 0.1,
  // Ties an event to the deploy that produced it, so "did this release cause
  // it?" is answerable. Vercel injects VERCEL_GIT_COMMIT_SHA automatically.
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // This app handles member names, phone numbers and payment amounts. Never
  // let request bodies, cookies or headers ride along with an error report.
  sendDefaultPii: false,
  beforeSend: scrubEvent,
});

/**
 * Strip request payloads and known-sensitive fields before an event leaves
 * the process. Sentry's default scrubbing is keyword-based and does not know
 * about this app's field names.
 */
function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
    // Approve-token links carry a bearer credential in the path.
    if (event.request.url) {
      event.request.url = event.request.url.replace(/\/approve\/[^/?#]+/, '/approve/[redacted]');
    }
  }
  if (event.user) {
    event.user = { id: event.user.id };
  }
  return event;
}

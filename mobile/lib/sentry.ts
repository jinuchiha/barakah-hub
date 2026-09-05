import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/**
 * Crash + error reporting for the mobile app.
 *
 * Before this file existed the app had NO crash reporting at all — a crash
 * on a member's phone was invisible unless they complained in person.
 *
 * DSN comes from EXPO_PUBLIC_SENTRY_DSN (eas.json env / .env). No DSN →
 * everything no-ops, so local dev and forks are unaffected. The DSN is a
 * public identifier by design; the bundle can carry it.
 *
 * Privacy: beforeSend strips anything resembling PII from what we control.
 * We never call Sentry.setUser with names/emails — member identity stays
 * out of the crash pipeline.
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    // Release tracking: ties every crash to an app version + update.
    release: `barakah-mobile@${Constants.expoConfig?.version ?? 'unknown'}`,
    dist: String(
      Constants.expoConfig?.android?.versionCode
      ?? Constants.expoConfig?.ios?.buildNumber
      ?? '0',
    ),
    environment: __DEV__ ? 'development' : 'production',
    enabled: !__DEV__,
    // Crash reporting, not performance monitoring — keep the quota for
    // what matters and the payloads small.
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Belt and braces: never ship request cookies/headers that a wrapped
      // fetch might have attached.
      if (event.request) delete event.request;
      return event;
    },
  });
}

/** Manually report a handled error with optional context tag. */
export function reportError(error: unknown, context?: string): void {
  if (!DSN || __DEV__) return;
  Sentry.captureException(error, context ? { tags: { context } } : undefined);
}

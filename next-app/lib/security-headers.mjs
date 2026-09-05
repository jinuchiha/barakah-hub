/**
 * Global security headers — pure data, imported by next.config.mjs and
 * unit-tested directly (test/lib/security-headers.test.ts).
 *
 * These were entirely absent before this file existed: no HSTS, no CSP,
 * no frame protection, nothing. Every response now carries the full set.
 */

/**
 * Content-Security-Policy.
 *
 * script-src includes 'unsafe-inline' because the Next.js App Router emits
 * inline bootstrap/hydration scripts; removing it requires per-request
 * nonces via middleware, which conflicts with static/ISR responses. The
 * rest of the policy is strict: no external scripts at all, no frames in
 * either direction, no object/embed, forms post only to this origin.
 * Dev additionally needs 'unsafe-eval' (react-refresh) and ws: (HMR).
 */
export function buildCsp(isDev) {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    // data: — qrcode lib renders data-URL images; blob: — upload previews.
    `img-src 'self' data: blob: https://*.public.blob.vercel-storage.com`,
    `font-src 'self' data:`,
    // Sentry browser SDK posts events to its ingest domain (region-varied).
    `connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io${isDev ? ' ws:' : ''}`,
    `worker-src 'self'`,
    `manifest-src 'self'`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ];
  if (!isDev) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

export function buildSecurityHeaders(isDev) {
  return [
    { key: 'Content-Security-Policy', value: buildCsp(isDev) },
    // Two years, subdomains included. `preload` is intentionally omitted —
    // submitting to the preload list is an operator decision that is very
    // hard to reverse.
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // Redundant with frame-ancestors for modern browsers; kept for the rest.
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // Geolocation stays first-party: qibla compass + prayer times use it.
    { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=(), usb=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
}

import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs module shared with next.config.mjs
import { buildSecurityHeaders, buildCsp } from '@/lib/security-headers.mjs';

interface Header { key: string; value: string }

function header(headers: Header[], key: string): string {
  const h = headers.find((x) => x.key === key);
  expect(h, `${key} must be present`).toBeDefined();
  return (h as Header).value;
}

describe('security headers — every response must carry the full set', () => {
  const prod = buildSecurityHeaders(false) as Header[];

  it('ships HSTS with a two-year max-age and subdomains', () => {
    const v = header(prod, 'Strict-Transport-Security');
    expect(v).toContain('max-age=63072000');
    expect(v).toContain('includeSubDomains');
  });

  it('ships nosniff, frame denial, referrer policy, permissions policy, COOP', () => {
    expect(header(prod, 'X-Content-Type-Options')).toBe('nosniff');
    expect(header(prod, 'X-Frame-Options')).toBe('DENY');
    expect(header(prod, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(header(prod, 'Permissions-Policy')).toContain('camera=()');
    expect(header(prod, 'Cross-Origin-Opener-Policy')).toBe('same-origin');
  });

  it('production CSP: no unsafe-eval, no frames, self-only forms and base', () => {
    const csp = buildCsp(false) as string;
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('CSP allows exactly the origins the app uses — blob images, sentry ingest', () => {
    const csp = buildCsp(false) as string;
    expect(csp).toContain('https://*.public.blob.vercel-storage.com');
    expect(csp).toContain('https://*.ingest.sentry.io');
    expect(csp).toContain("script-src 'self' 'unsafe-inline'; ");
  });

  it('dev adds eval + websockets for HMR, prod does not', () => {
    const dev = buildCsp(true) as string;
    expect(dev).toContain('unsafe-eval');
    expect(dev).toContain('ws:');
    expect(buildCsp(false)).not.toContain('ws:');
  });
});

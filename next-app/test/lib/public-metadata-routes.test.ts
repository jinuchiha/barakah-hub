import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * app/robots.ts shipped doing nothing.
 *
 * Next.js turns these metadata files into real routes, and a crawler
 * requesting one carries no session cookie — so the auth middleware
 * redirected /robots.txt to /login with a 307 and the rules were never
 * served to anybody. Worse than a missing file: the pages robots.ts exists
 * to keep out of search results were left with no directive at all, while
 * the repo looked like it had handled them.
 *
 * /manifest.webmanifest and /sw.js were already in the allowlist, with a
 * comment explaining exactly this hazard. robots.txt was added later and
 * missed it. The comment was not enough; this is.
 */

const APP = path.resolve(__dirname, '../..');
const middleware = readFileSync(path.join(APP, 'middleware.ts'), 'utf8');

/**
 * Metadata conventions that Next serves at a fixed public path. Anything a
 * crawler or an unauthenticated browser is expected to fetch belongs here.
 */
const METADATA_ROUTES: { source: string; servedAt: string; why: string }[] = [
  { source: 'app/robots.ts', servedAt: '/robots.txt', why: 'crawlers send no session cookie' },
  { source: 'app/sitemap.ts', servedAt: '/sitemap.xml', why: 'crawlers send no session cookie' },
  { source: 'app/manifest.ts', servedAt: '/manifest.webmanifest', why: 'PWA install fetches it logged out' },
];

/** The PUBLIC_ROUTES array as written in middleware.ts. */
function publicRoutes(): string[] {
  const m = /const PUBLIC_ROUTES\s*=\s*\[([^\]]*)\]/.exec(middleware);
  if (!m) throw new Error('PUBLIC_ROUTES not found in middleware.ts — did it get renamed?');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

describe('public metadata routes', () => {
  it('finds the PUBLIC_ROUTES allowlist', () => {
    // If this fails the rest of the file is asserting nothing, so it is
    // checked on its own rather than left to throw inside another test.
    expect(publicRoutes().length).toBeGreaterThan(0);
  });

  it('exempts every metadata route that exists from the auth gate', () => {
    const allow = publicRoutes();
    for (const route of METADATA_ROUTES) {
      if (!existsSync(path.join(APP, route.source))) continue;
      const exempt = allow.some((p) => route.servedAt.startsWith(p));
      expect(
        exempt,
        `${route.source} is served at ${route.servedAt}, but that path is not in `
        + `PUBLIC_ROUTES, so the middleware redirects it to /login — ${route.why}. `
        + 'The route ships and does nothing, which is harder to notice than it '
        + 'being absent.',
      ).toBe(true);
    }
  });

  it('does not exempt a path for a metadata file that was deleted', () => {
    // The mirror mistake: an allowlist entry outliving the route it opened,
    // quietly widening what bypasses the auth gate.
    const allow = publicRoutes();
    for (const route of METADATA_ROUTES) {
      if (existsSync(path.join(APP, route.source))) continue;
      expect(
        allow,
        `${route.servedAt} is exempt from the auth gate but ${route.source} no longer `
        + 'exists. Remove the allowlist entry rather than leaving a hole open.',
      ).not.toContain(route.servedAt);
    }
  });
});

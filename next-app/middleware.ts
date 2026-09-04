import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { REQUEST_ID_HEADER } from '@/lib/log';

/**
 * Middleware — gates auth-required routes behind a Better-Auth session.
 *
 * Uses `getSessionCookie` (just reads the cookie value, no DB call) for
 * fast redirects. The actual session validation happens in server
 * components / actions where they need it.
 *
 * Runs on Vercel's Edge runtime by default — no explicit runtime export
 * needed. Next 16 will warn about the deprecated `middleware.ts` filename;
 * switch to `proxy.ts` when convenient.
 */

// manifest + service worker must stay public or PWA install breaks for
// logged-out visitors (the manifest request carries no session cookie).
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/verify-receipt', '/approve', '/pending', '/rejected', '/join', '/privacy', '/terms', '/manifest.webmanifest', '/sw.js'];

/**
 * Stamp a request id on every request.
 *
 * Every log line, Sentry event and error response for one request now shares
 * this id, which is what turns "my payment failed this morning" from an
 * unanswerable question into a text search. Honours an inbound
 * x-request-id so a client or an upstream proxy can supply its own and the
 * trace survives the hop.
 *
 * Done in middleware because it runs before everything else — pages, actions
 * and route handlers all read it from the request headers.
 */
function withRequestId(request: NextRequest, response: NextResponse): NextResponse {
  const id = request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
  // On the response so a user can quote it in a bug report.
  response.headers.set(REQUEST_ID_HEADER, id);
  return response;
}

/** Continue the chain with the id attached to the onward request. */
function nextWithId(request: NextRequest): NextResponse {
  const id = request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
  const forwarded = new Headers(request.headers);
  forwarded.set(REQUEST_ID_HEADER, id);
  const res = NextResponse.next({ request: { headers: forwarded } });
  res.headers.set(REQUEST_ID_HEADER, id);
  return res;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes authenticate themselves (session cookie OR Bearer token OR
  // CRON_SECRET) and must return JSON, never a login redirect. A cookie
  // redirect here silently killed Vercel cron jobs and mobile Bearer calls.
  if (pathname.startsWith('/api')) {
    return nextWithId(request);
  }

  // Don't gate public routes or static assets — matcher handles assets.
  if (PUBLIC_ROUTES.some((p) => pathname.startsWith(p)) || pathname === '/') {
    return nextWithId(request);
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return withRequestId(request, NextResponse.redirect(url));
  }

  return nextWithId(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};

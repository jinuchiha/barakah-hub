import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

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
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/verify-receipt', '/pending', '/rejected', '/join', '/manifest.webmanifest', '/sw.js'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes authenticate themselves (session cookie OR Bearer token OR
  // CRON_SECRET) and must return JSON, never a login redirect. A cookie
  // redirect here silently killed Vercel cron jobs and mobile Bearer calls.
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Don't gate public routes or static assets — matcher handles assets.
  if (PUBLIC_ROUTES.some((p) => pathname.startsWith(p)) || pathname === '/') {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};

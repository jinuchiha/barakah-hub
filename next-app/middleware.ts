import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Edge middleware — gates auth-required routes behind a Better-Auth session.
 *
 * Uses `getSessionCookie` (just reads the cookie value, no DB call) for
 * fast edge-level redirects. The actual session validation happens in
 * server components / actions where they need it.
 *
 * Why `middleware.ts` and not Next 16's `proxy.ts`?
 *  - Next 16's proxy.ts is locked to the Node.js runtime.
 *  - @opennextjs/cloudflare deploys to Workers (V8 isolates) which do
 *    not yet support Node middleware. middleware.ts is deprecated but
 *    still functional and still permits Edge runtime — what Workers run.
 *  - Switch back to proxy.ts when OpenNext ships Node-runtime support.
 */
// Next 16 rejects 'edge' on middleware ("currently experimental"); keep
// 'experimental-edge' until that warning is gone in a later release.
export const runtime = 'experimental-edge';

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/api/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

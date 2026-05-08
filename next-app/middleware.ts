import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Why `middleware.ts` and not the Next 16 `proxy.ts` convention?
 *
 * Next 16's `proxy.ts` is locked to the Node.js runtime, but
 * @opennextjs/cloudflare deploys to Workers (V8 isolates) and does not
 * yet support Node middleware. `middleware.ts` is deprecated in Next 16
 * but still functional, and crucially it still allows the Edge runtime,
 * which is what Workers actually run.
 *
 * Switch back to proxy.ts when OpenNext ships Node-runtime support.
 */
export const runtime = 'experimental-edge';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};

import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`.
 * The new convention requires the export to be named `proxy` (or default).
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};

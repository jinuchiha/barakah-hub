import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { members, type Member } from '@/lib/db/schema';

/**
 * Server-side helpers — read the current Better-Auth session inside
 * server components, server actions, and route handlers.
 *
 * Replaces the previous `lib/supabase/server.ts createClient()` pattern.
 */

export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session; // null if unauthenticated
}

export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Server-component helper used by every `(app)/*` page:
 *  - redirects to /login if no session
 *  - redirects to /onboarding if the user has no member row yet
 *  - returns the member record otherwise
 *
 * Use at the top of any auth-required page:
 *   const me = await getMeOrRedirect();
 */
export async function getMeOrRedirect(): Promise<Member> {
  const session = await getSession();
  if (!session?.user) redirect('/login');

  const [me] = await db
    .select()
    .from(members)
    .where(eq(members.authId, session.user.id))
    .limit(1);

  if (!me) redirect('/onboarding');
  // Unapproved members must not reach protected app routes
  if (me.status === 'pending') redirect('/pending' as any);
  if (me.status === 'rejected') redirect('/rejected' as any);
  return me;
}

/**
 * Shared action helper — validates session and returns the member record.
 * Throws (not redirects) so it's safe to call inside server actions.
 * Used by app/actions.ts, broadcast/actions.ts, and any future action file.
 */
export async function meOrThrow(): Promise<Member> {
  const session = await getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const [m] = await db.select().from(members).where(eq(members.authId, session.user.id)).limit(1);
  if (!m) throw new Error('Member record not found');
  return m;
}

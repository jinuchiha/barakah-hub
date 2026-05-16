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

/**
 * Permission predicates.
 *
 *  - canManageFunds: record + verify + reject payments. Admins AND
 *    supervisors both pass. Used by /api/payments/* routes and the
 *    admin/fund page.
 *  - isAdminOnly: admin-only operations (member CRUD, loan issuing,
 *    case veto, config changes). Supervisors are blocked here so a
 *    fund-collector can't accidentally demote an admin or wipe data.
 */
export function canManageFunds(role: Member['role']): boolean {
  return role === 'admin' || role === 'supervisor';
}

export function isAdminOnly(role: Member['role']): boolean {
  return role === 'admin';
}

/**
 * Helper for page components: if the viewer is a supervisor, redirect
 * them to /admin/fund (their only authorised destination). Returns the
 * viewer's member record on the regular path. Call at the top of any
 * page supervisors shouldn't see.
 */
export async function getMeOrRedirectSupervisor(): Promise<Member> {
  const me = await getMeOrRedirect();
  if (me.role === 'supervisor') redirect('/admin/fund');
  return me;
}

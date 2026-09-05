import { cache } from 'react';
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
 *
 * `getSession` and the member lookup are wrapped in React.cache: the layout
 * and every page both call getMeOrRedirect, so without memoisation each
 * request paid the Better-Auth session query and the members SELECT at least
 * twice. React.cache scopes to one request — no cross-request staleness.
 */

export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session; // null if unauthenticated
});

const memberByAuthId = cache(async (authId: string): Promise<Member | null> => {
  const [m] = await db.select().from(members).where(eq(members.authId, authId)).limit(1);
  return m ?? null;
});

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

  const me = await memberByAuthId(session.user.id);

  if (!me) redirect('/onboarding');
  // Unapproved members must not reach protected app routes
  if (me.status === 'pending') redirect('/pending');
  if (me.status === 'rejected') redirect('/rejected');
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
  const m = await memberByAuthId(session.user.id);
  if (!m) throw new Error('Member record not found');
  return m;
}

/**
 * Like meOrThrow, but additionally requires the member to be approved and
 * not deceased. Use on REST routes that perform member-level actions
 * (vote, create case, submit donation) so pending/rejected/deceased users
 * are blocked at the API layer — matching the server-action guards the
 * web pages rely on.
 */
export async function meApprovedOrThrow(): Promise<Member> {
  const m = await meOrThrow();
  if (m.status !== 'approved' || m.deceased) {
    throw new Error('Account not approved');
  }
  return m;
}

/**
 * THE privileged-action gate. Every action that acts on someone else's data
 * or on org-wide state must obtain its caller through this function.
 *
 * Why this exists: `meOrThrow()` proves only that a session maps to a member
 * row. It says nothing about whether that member is still *entitled* to act.
 * Call sites used to pair it with a bare `if (me.role !== 'admin')`, which
 * checked the role but never the status or the deceased flag — so rejecting
 * an admin's member row (the one lever an operator pulls in an emergency)
 * did not actually revoke their power over the REST surface, where the
 * page-level `getMeOrRedirect` status checks never run.
 *
 * Checks run in escalating order so the caller learns the *first* reason
 * they were refused, and so an entitlement failure is never masked by a
 * role failure:
 *   1. authenticated + has a member row   (meOrThrow)
 *   2. status === 'approved'
 *   3. not deceased
 *   4. role ∈ roles
 *
 * `denyMessage` exists only to preserve the exact strings that REST routes
 * map to HTTP 403 — see `errorStatus()` in lib/api-error.ts.
 */
export async function requireRole(
  roles: readonly Member['role'][],
  denyMessage = 'Admin only',
): Promise<Member> {
  const m = await meOrThrow();
  if (m.status !== 'approved') throw new Error('Account not approved');
  if (m.deceased) throw new Error('Account inactive');
  if (!roles.includes(m.role)) throw new Error(denyMessage);
  return m;
}

/** Admin-only privileged caller. The common case. */
export async function requireAdmin(denyMessage = 'Admin only'): Promise<Member> {
  return requireRole(['admin'], denyMessage);
}

/** Admin or supervisor — the money operations. */
export async function requireFundManager(
  denyMessage = 'Supervisor or admin only',
): Promise<Member> {
  return requireRole(['admin', 'supervisor'], denyMessage);
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

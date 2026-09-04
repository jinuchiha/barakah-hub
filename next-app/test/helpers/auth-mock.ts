/**
 * Shared mock of `@/lib/auth-server` for server-action tests.
 *
 * This deliberately re-implements the REAL gate semantics rather than
 * stubbing them out. The whole point of `requireRole` is that entitlement
 * (approved + not deceased) is checked before the role, in one place that a
 * call site cannot skip — a mock that always returns the member would let
 * that regress silently, which is exactly the class of bug the gate exists
 * to prevent. Keep this in sync with lib/auth-server.ts.
 */

interface MemberLike {
  id: string;
  role: 'admin' | 'member' | 'supervisor';
  status: 'pending' | 'approved' | 'rejected';
  deceased: boolean;
}

type SessionHolder = { instance: unknown };
type DbHolder = { instance: unknown };

export function makeAuthServerMock(sessionMock: SessionHolder, dbMock: DbHolder) {
  async function meOrThrow(): Promise<MemberLike> {
    const session = sessionMock.instance as { user?: { id: string } } | null;
    if (!session?.user) throw new Error('Not authenticated');
    const db = dbMock.instance as {
      select: () => { from: (t: unknown) => { where: (w: unknown) => { limit: (n: number) => Promise<unknown> } } };
    };
    const result = await db.select().from({}).where({}).limit(1);
    const m = (Array.isArray(result) ? result[0] : result) as MemberLike | undefined;
    if (!m) throw new Error('Member record not found');
    return m;
  }

  async function meApprovedOrThrow(): Promise<MemberLike> {
    const m = await meOrThrow();
    if (m.status !== 'approved' || m.deceased) throw new Error('Account not approved');
    return m;
  }

  async function requireRole(
    roles: readonly MemberLike['role'][],
    denyMessage = 'Admin only',
  ): Promise<MemberLike> {
    const m = await meOrThrow();
    if (m.status !== 'approved') throw new Error('Account not approved');
    if (m.deceased) throw new Error('Account inactive');
    if (!roles.includes(m.role)) throw new Error(denyMessage);
    return m;
  }

  return {
    getSession: async () => sessionMock.instance,
    getUser: async () => (sessionMock.instance as { user?: unknown })?.user ?? null,
    getMeOrRedirect: async () => { throw new Error('not used in action tests'); },
    getMeOrRedirectSupervisor: async () => { throw new Error('not used in action tests'); },
    meOrThrow,
    meApprovedOrThrow,
    requireRole,
    requireAdmin: (denyMessage = 'Admin only') => requireRole(['admin'], denyMessage),
    requireFundManager: (denyMessage = 'Supervisor or admin only') =>
      requireRole(['admin', 'supervisor'], denyMessage),
    canManageFunds: (role: MemberLike['role']) => role === 'admin' || role === 'supervisor',
    isAdminOnly: (role: MemberLike['role']) => role === 'admin',
  };
}

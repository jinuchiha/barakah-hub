/**
 * Regression tests for the privileged-action gate in lib/auth-server.ts.
 *
 * These exercise the REAL module, not a mock. The bug being pinned down here
 * (BH-04) was that `meOrThrow()` proved only "this session maps to a member
 * row" while every privileged action paired it with a bare role check — so a
 * member whose status was set to 'rejected', or who was marked deceased,
 * kept full admin power over the REST surface. Rejecting someone's row, the
 * one lever an operator pulls in an emergency, did not revoke anything.
 *
 * The ordering assertions matter as much as the outcomes: entitlement must be
 * evaluated before role, otherwise a rejected admin is refused with "Admin
 * only" and the operator is told the wrong thing about why.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sessionMock = vi.hoisted(() => ({ instance: null as unknown }));
const rowMock = vi.hoisted(() => ({ instance: [] as unknown[] }));

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); } }));
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: async () => sessionMock.instance } },
}));
vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => rowMock.instance }) }),
    }),
  },
}));

const base = {
  id: 'm1',
  authId: 'auth-1',
  role: 'admin' as const,
  status: 'approved' as const,
  deceased: false,
};

const session = { user: { id: 'auth-1' } };

function given(member: Partial<typeof base> | null) {
  sessionMock.instance = session;
  rowMock.instance = member ? [{ ...base, ...member }] : [];
}

beforeEach(() => vi.resetModules());

describe('requireRole — entitlement is checked before role', () => {
  it('returns the member when approved, living and correctly roled', async () => {
    given({ role: 'admin' });
    const { requireRole } = await import('@/lib/auth-server');
    await expect(requireRole(['admin'])).resolves.toMatchObject({ id: 'm1', role: 'admin' });
  });

  it('refuses an unauthenticated caller', async () => {
    sessionMock.instance = null;
    const { requireRole } = await import('@/lib/auth-server');
    await expect(requireRole(['admin'])).rejects.toThrow('Not authenticated');
  });

  it('refuses a session with no member row', async () => {
    given(null);
    const { requireRole } = await import('@/lib/auth-server');
    await expect(requireRole(['admin'])).rejects.toThrow('Member record not found');
  });

  // The core regression: an admin whose row was rejected keeps the admin
  // ROLE, so a role-only check passes. Entitlement must refuse first.
  it('refuses a REJECTED admin — and says why, not "Admin only"', async () => {
    given({ role: 'admin', status: 'rejected' });
    const { requireRole } = await import('@/lib/auth-server');
    await expect(requireRole(['admin'])).rejects.toThrow('Account not approved');
  });

  it('refuses a PENDING admin', async () => {
    given({ role: 'admin', status: 'pending' });
    const { requireRole } = await import('@/lib/auth-server');
    await expect(requireRole(['admin'])).rejects.toThrow('Account not approved');
  });

  it('refuses a DECEASED admin', async () => {
    given({ role: 'admin', deceased: true });
    const { requireRole } = await import('@/lib/auth-server');
    await expect(requireRole(['admin'])).rejects.toThrow('Account inactive');
  });

  it('refuses a wrong-role caller who is otherwise entitled', async () => {
    given({ role: 'member' });
    const { requireRole } = await import('@/lib/auth-server');
    await expect(requireRole(['admin'])).rejects.toThrow('Admin only');
  });

  it('honours a custom deny message so REST status mapping stays stable', async () => {
    given({ role: 'member' });
    const { requireRole } = await import('@/lib/auth-server');
    await expect(requireRole(['admin'], 'Only admin can add members'))
      .rejects.toThrow('Only admin can add members');
  });
});

describe('requireAdmin / requireFundManager', () => {
  it('requireAdmin accepts admin', async () => {
    given({ role: 'admin' });
    const { requireAdmin } = await import('@/lib/auth-server');
    await expect(requireAdmin()).resolves.toMatchObject({ role: 'admin' });
  });

  it('requireAdmin rejects a supervisor — supervisors must not do member CRUD', async () => {
    given({ role: 'supervisor' });
    const { requireAdmin } = await import('@/lib/auth-server');
    await expect(requireAdmin()).rejects.toThrow('Admin only');
  });

  it('requireFundManager accepts both admin and supervisor', async () => {
    const { requireFundManager } = await import('@/lib/auth-server');
    given({ role: 'admin' });
    await expect(requireFundManager()).resolves.toMatchObject({ role: 'admin' });
    given({ role: 'supervisor' });
    await expect(requireFundManager()).resolves.toMatchObject({ role: 'supervisor' });
  });

  it('requireFundManager rejects a plain member', async () => {
    given({ role: 'member' });
    const { requireFundManager } = await import('@/lib/auth-server');
    await expect(requireFundManager()).rejects.toThrow('Supervisor or admin only');
  });

  it('requireFundManager still refuses a deceased supervisor', async () => {
    given({ role: 'supervisor', deceased: true });
    const { requireFundManager } = await import('@/lib/auth-server');
    await expect(requireFundManager()).rejects.toThrow('Account inactive');
  });
});

describe('meApprovedOrThrow', () => {
  it('accepts an approved living member', async () => {
    given({ role: 'member' });
    const { meApprovedOrThrow } = await import('@/lib/auth-server');
    await expect(meApprovedOrThrow()).resolves.toMatchObject({ id: 'm1' });
  });

  it('refuses pending and deceased alike', async () => {
    const { meApprovedOrThrow } = await import('@/lib/auth-server');
    given({ status: 'pending' });
    await expect(meApprovedOrThrow()).rejects.toThrow('Account not approved');
    given({ deceased: true });
    await expect(meApprovedOrThrow()).rejects.toThrow('Account not approved');
  });
});

describe('meOrThrow stays permissive on purpose', () => {
  // Self-scoped operations (profile setup during onboarding, marking your
  // own notifications read) must remain available to a pending member.
  // If this ever starts refusing, onboarding breaks.
  it('allows a pending member through', async () => {
    given({ status: 'pending', role: 'member' });
    const { meOrThrow } = await import('@/lib/auth-server');
    await expect(meOrThrow()).resolves.toMatchObject({ status: 'pending' });
  });
});

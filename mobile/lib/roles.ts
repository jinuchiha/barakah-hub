import type { Role } from '@/types';

/**
 * Role predicates mirrored from the web (next-app/lib/auth-server.ts):
 *  - canManageFunds: admins AND supervisors can reach the payment-approval
 *    queue. Supervisors pre-approve; admins give final verification.
 *  - isAdminOnly: member CRUD, loan issuing, case veto, config, broadcast,
 *    invites — supervisors are blocked.
 */
export function canManageFunds(role: Role | undefined | null): boolean {
  return role === 'admin' || role === 'supervisor';
}

export function isAdminOnly(role: Role | undefined | null): boolean {
  return role === 'admin';
}

export function roleLabel(role: Role | undefined | null): string {
  if (role === 'admin') return 'Admin';
  if (role === 'supervisor') return 'Supervisor';
  return 'Member';
}

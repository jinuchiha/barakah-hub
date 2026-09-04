/**
 * Structural guard on the authorization surface (BH-04).
 *
 * The original defect was not a missing check in one place — it was that the
 * pattern `meOrThrow()` + a hand-written `if (me.role !== 'admin')` had to be
 * repeated correctly at ~30 call sites, and the entitlement half (status,
 * deceased) was simply absent from all of them. Fixing the call sites without
 * pinning the pattern would let the next new action reintroduce it.
 *
 * So this test reads app/actions.ts as source and asserts that EVERY exported
 * server action opens with one of the sanctioned gates. A new action that
 * forgets fails CI, and one that deliberately needs the permissive gate has
 * to be added to the allow-list below with a reason.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(join(process.cwd(), 'app', 'actions.ts'), 'utf8');

/**
 * Actions that legitimately use the permissive `meOrThrow()`: strictly
 * self-scoped operations a PENDING member must still be able to perform.
 * Adding to this list is a deliberate security decision.
 */
const SELF_SCOPED_ALLOWLIST = new Set([
  // A member fills in their own profile during onboarding, before approval.
  'updateProfile',
  // Reading your own notifications/messages is not a privileged operation.
  'markAllNotificationsRead',
  'markAllMessagesRead',
]);

interface Action { name: string; gate: string }

function parseActions(): Action[] {
  return SRC
    .split(/(?=^export async function )/m)
    .filter((b) => b.startsWith('export async function'))
    .map((b) => {
      const name = /^export async function (\w+)/.exec(b)![1];
      const head = b.split(/\r?\n/).slice(0, 12).join('\n');
      let gate = 'NONE';
      if (/await requireAdmin\(/.test(head)) gate = 'requireAdmin';
      else if (/await requireFundManager\(/.test(head)) gate = 'requireFundManager';
      else if (/await meApprovedOrThrow\(/.test(head)) gate = 'meApprovedOrThrow';
      else if (/await meOrThrow\(/.test(head)) gate = 'meOrThrow';
      return { name, gate };
    });
}

describe('server action authorization coverage', () => {
  const actions = parseActions();

  it('finds the action surface (guards against the parser silently matching nothing)', () => {
    expect(actions.length).toBeGreaterThan(25);
  });

  it('every exported action obtains its caller through a gate', () => {
    const ungated = actions.filter((a) => a.gate === 'NONE').map((a) => a.name);
    expect(ungated, `ungated actions: ${ungated.join(', ')}`).toEqual([]);
  });

  it('only allow-listed self-scoped actions use the permissive meOrThrow gate', () => {
    const permissive = actions.filter((a) => a.gate === 'meOrThrow').map((a) => a.name);
    const unexpected = permissive.filter((n) => !SELF_SCOPED_ALLOWLIST.has(n));
    expect(
      unexpected,
      `These actions use meOrThrow(), which checks neither status nor the deceased flag. ` +
      `Use requireAdmin / requireFundManager / meApprovedOrThrow, or add to the ` +
      `allow-list with a reason: ${unexpected.join(', ')}`,
    ).toEqual([]);
  });

  it('the money actions use the strictest gate that fits', () => {
    const byName = new Map(actions.map((a) => [a.name, a.gate]));
    expect(byName.get('verifyPayment')).toBe('requireAdmin');
    expect(byName.get('adminDeletePayment')).toBe('requireAdmin');
    expect(byName.get('issueLoan')).toBe('requireAdmin');
    expect(byName.get('recordRepayment')).toBe('requireAdmin');
    expect(byName.get('disburseCase')).toBe('requireAdmin');
    expect(byName.get('recordPayment')).toBe('requireFundManager');
    expect(byName.get('supervisorApprovePayment')).toBe('requireFundManager');
    expect(byName.get('supervisorRejectPayment')).toBe('requireFundManager');
  });

  it('no action pairs the permissive gate with a hand-rolled role check', () => {
    // The exact anti-pattern that produced BH-04.
    const blocks = SRC.split(/(?=^export async function )/m);
    const offenders = blocks
      .filter((b) => b.startsWith('export async function'))
      .filter((b) => {
        const head = b.split(/\r?\n/).slice(0, 12).join('\n');
        return /await meOrThrow\(/.test(head) && /if \(me\.role !== '(admin|supervisor)'\)/.test(head);
      })
      .map((b) => /^export async function (\w+)/.exec(b)![1]);
    expect(offenders).toEqual([]);
  });
});

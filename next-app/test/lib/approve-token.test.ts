import { describe, it, expect, beforeAll } from 'vitest';
import { signApproveToken, verifyApproveToken } from '@/lib/approve-token';

const PAYMENT = '00000000-0000-0000-0000-000000000001';
const APPROVER = 'member-supervisor-1';

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'test-secret-for-approve-tokens';
});

describe('approve-token — the one-tap link IS the login, so it must be unforgeable', () => {
  it('round-trips a valid token', () => {
    const token = signApproveToken(PAYMENT, APPROVER);
    const payload = verifyApproveToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.p).toBe(PAYMENT);
    expect(payload?.a).toBe(APPROVER);
  });

  it('rejects a tampered payload (swapping in another approver)', () => {
    const token = signApproveToken(PAYMENT, APPROVER);
    const [body] = token.split('.');
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString());
    decoded.a = 'attacker-member';
    const forgedBody = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    const forged = `${forgedBody}.${token.split('.')[1]}`;
    expect(verifyApproveToken(forged)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const token = signApproveToken(PAYMENT, APPROVER);
    expect(verifyApproveToken(token.slice(0, -2) + 'xx')).toBeNull();
  });

  it('rejects an expired token', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const token = signApproveToken(PAYMENT, APPROVER, eightDaysAgo);
    expect(verifyApproveToken(token)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifyApproveToken('')).toBeNull();
    expect(verifyApproveToken('not-a-token')).toBeNull();
    expect(verifyApproveToken('a.b')).toBeNull();
  });
});

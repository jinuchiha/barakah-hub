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

  it('rejects an expired token — TTL is 48 hours, not 7 days', () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const token = signApproveToken(PAYMENT, APPROVER, threeDaysAgo);
    expect(verifyApproveToken(token)).toBeNull();
  });

  it('is still valid within the 48-hour window', () => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    const token = signApproveToken(PAYMENT, APPROVER, yesterday);
    expect(verifyApproveToken(token)).not.toBeNull();
  });

  it('every token carries a unique jti — the one-time-use handle', () => {
    const t1 = signApproveToken(PAYMENT, APPROVER);
    const t2 = signApproveToken(PAYMENT, APPROVER);
    const p1 = verifyApproveToken(t1);
    const p2 = verifyApproveToken(t2);
    expect(p1?.jti).toBeTruthy();
    expect(p2?.jti).toBeTruthy();
    expect(p1?.jti).not.toBe(p2?.jti);
  });

  it('rejects legacy tokens without a jti — replayable links die at deploy', () => {
    const legacy = { p: PAYMENT, a: APPROVER, exp: Date.now() + 60_000 };
    const body = Buffer.from(JSON.stringify(legacy)).toString('base64url');
    const { createHmac } = require('crypto') as typeof import('crypto');
    const sig = createHmac('sha256', process.env.BETTER_AUTH_SECRET as string).update(body).digest('base64url');
    expect(verifyApproveToken(`${body}.${sig}`)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifyApproveToken('')).toBeNull();
    expect(verifyApproveToken('not-a-token')).toBeNull();
    expect(verifyApproveToken('a.b')).toBeNull();
  });
});

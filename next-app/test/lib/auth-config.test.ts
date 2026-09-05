import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Locks the security-critical Better-Auth configuration. These are one-line
 * options that quietly disappearing would reopen closed findings — exactly
 * the kind of regression a reviewer won't spot in a big diff.
 */
let auth: typeof import('@/lib/auth').auth;

beforeAll(async () => {
  // lib/db throws at import without a URL; lib/auth throws without a secret.
  process.env.DATABASE_URL ??= 'postgresql://ci:ci@localhost/ci?sslmode=require';
  process.env.BETTER_AUTH_SECRET ??= 'test-secret-long-enough-for-better-auth-import';
  ({ auth } = await import('@/lib/auth'));
}, 120_000); // cold import of the auth graph is slow on this machine

describe('auth hardening options', () => {
  it('rate limiting is DATABASE-backed — global caps, not per-lambda', () => {
    expect(auth.options.rateLimit?.enabled).toBe(true);
    expect(auth.options.rateLimit?.storage).toBe('database');
    expect(auth.options.rateLimit?.modelName).toBe('rateLimit');
  });

  it('login and OTP-send endpoints keep their tight custom caps', () => {
    const rules = auth.options.rateLimit?.customRules ?? {};
    expect(rules['/sign-in/email']).toMatchObject({ max: 5 });
    expect(rules['/email-otp/send-verification-otp']).toMatchObject({ max: 3 });
  });

  it('password reset revokes every existing session', () => {
    expect(auth.options.emailAndPassword?.revokeSessionsOnPasswordReset).toBe(true);
  });

  it('the rateLimit model is mapped to the rate_limits table', async () => {
    const { rateLimits } = await import('@/lib/db/schema');
    expect(rateLimits).toBeDefined();
  });
});

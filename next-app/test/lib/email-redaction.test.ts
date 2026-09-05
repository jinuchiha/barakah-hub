import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { maskEmail, sendResetPasswordEmail } from '@/lib/email';

describe('maskEmail', () => {
  it('keeps first character and domain only', () => {
    expect(maskEmail('usman@example.com')).toBe('u***@example.com');
  });
  it('never returns the input for malformed addresses', () => {
    expect(maskEmail('not-an-email')).toBe('***');
    expect(maskEmail('@nodomain')).toBe('***');
  });
});

describe('sendResetPasswordEmail — the reset URL must never reach a log', () => {
  const RESET_URL = 'https://app.example/reset-password?token=SECRET-RESET-TOKEN-123';
  const EMAIL = 'victim@example.com';
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let savedKey: string | undefined;

  beforeEach(() => {
    savedKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (savedKey !== undefined) process.env.RESEND_API_KEY = savedKey;
    vi.restoreAllMocks();
  });

  it('with no email provider: resolves, and NOTHING logged contains the URL, token, or address', async () => {
    await expect(sendResetPasswordEmail(EMAIL, RESET_URL)).resolves.toBeUndefined();

    const allLogged = [...warnSpy.mock.calls, ...errorSpy.mock.calls, ...logSpy.mock.calls]
      .flat()
      .map(String)
      .join('\n');

    expect(allLogged).not.toContain('SECRET-RESET-TOKEN-123');
    expect(allLogged).not.toContain(RESET_URL);
    expect(allLogged).not.toContain(EMAIL);
    expect(allLogged).toContain('Password-reset email skipped');
  });
});

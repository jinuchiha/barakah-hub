/**
 * Regression tests for lib/api-error.ts (BH-14).
 *
 * Two problems the shared contract fixes:
 *
 *  · Routes hand-rolled their status mapping and several fell through to 400
 *    for authentication failures. The mobile client only clears its stored
 *    session on a 401 (mobile/lib/api.ts), so an expired session on those
 *    routes produced a generic error the app could never recover from.
 *
 *  · Routes echoed `err.message` verbatim, so Postgres constraint text and
 *    driver internals reached the client.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { errorStatus, isExpectedError, errorResponse } from '@/lib/api-error';

afterEach(() => vi.restoreAllMocks());

describe('errorStatus', () => {
  it('maps authentication failures to 401 so the mobile client can recover', () => {
    expect(errorStatus('Not authenticated')).toBe(401);
    expect(errorStatus('Member record not found')).toBe(401);
  });

  it('maps entitlement and role refusals to 403', () => {
    for (const m of [
      'Admin only',
      'Supervisor or admin only',
      'Account not approved',
      'Account inactive',
      'Only admin can add members',
      'Only admin or supervisor can record payments',
    ]) {
      expect(errorStatus(m)).toBe(403);
    }
  });

  it('defaults everything else to 400', () => {
    expect(errorStatus('Payment not found')).toBe(400);
  });
});

describe('isExpectedError', () => {
  it('recognises our own guard messages', () => {
    expect(isExpectedError('Admin only')).toBe(true);
    expect(isExpectedError('Not authenticated')).toBe(true);
  });
  it('does not vouch for arbitrary text', () => {
    expect(isExpectedError('duplicate key value violates unique constraint')).toBe(false);
  });
});

describe('errorResponse', () => {
  it('returns 401 for an auth error, with the message intact', async () => {
    const res = errorResponse(new Error('Not authenticated'), 'test');
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Not authenticated' });
  });

  it('returns 403 for a rejected admin — entitlement, not role', async () => {
    const res = errorResponse(new Error('Account not approved'), 'test');
    expect(res.status).toBe(403);
  });

  it('passes business-rule messages through as 400', async () => {
    const res = errorResponse(new Error('Loan already settled'), 'test');
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Loan already settled' });
  });

  it('MASKS database internals behind a generic 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = errorResponse(
      new Error('duplicate key value violates unique constraint "payments_idempotency_key_uidx"'),
      'POST /api/payments/submit',
    );
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Something went wrong. Please try again.');
    expect(body.error).not.toMatch(/constraint|payments_/);
  });

  it('masks connection faults too', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = errorResponse(new Error('fetch failed: ECONNREFUSED'), 'test');
    expect(res.status).toBe(500);
  });

  it('logs the masked error server-side so it is still diagnosable', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    errorResponse(new Error('relation "payments" does not exist'), 'GET /api/payments');
    expect(spy).toHaveBeenCalled();
    expect(String(spy.mock.calls[0][0])).toContain('GET /api/payments');
  });

  it('does not leak an unbounded error string to the client', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = errorResponse(new Error('x'.repeat(500)), 'test');
    expect(res.status).toBe(500);
  });

  it('handles non-Error throws without crashing', async () => {
    const res = errorResponse('plain string failure', 'test');
    expect(res.status).toBe(400);
  });
});

import { NextResponse } from 'next/server';

/**
 * One error contract for every REST route.
 *
 * Two problems this fixes:
 *
 *  1. Routes hand-rolled their own status mapping, and several fell through
 *     to 400 for authentication failures. The mobile client only clears its
 *     stored session on a 401 (see mobile/lib/api.ts), so an expired session
 *     on those routes produced a generic error the app could never recover
 *     from — the user was stuck until they reinstalled.
 *
 *  2. Routes echoed `err.message` verbatim, leaking Postgres constraint text
 *     and Zod internals to the client. Only messages this module recognises
 *     as *intentional* (thrown by our own guards) are passed through; every
 *     other error collapses to a generic 500 and is logged server-side.
 */

/** Messages our own guards throw. Anything not listed here is treated as an
 *  internal fault and never echoed back to the caller. */
const AUTH_MESSAGES = new Set([
  'Not authenticated',
  'Member record not found',
]);

const FORBIDDEN_MESSAGES = new Set([
  'Admin only',
  'Supervisor or admin only',
  'Account not approved',
  'Account inactive',
  'Not eligible',
  'Only admin can add members',
  'Only admin or supervisor can record payments',
]);

export function errorStatus(message: string): number {
  if (AUTH_MESSAGES.has(message)) return 401;
  if (FORBIDDEN_MESSAGES.has(message)) return 403;
  return 400;
}

/** True when the message came from one of our deliberate guards and is safe
 *  to show a user. Validation errors (Zod) are safe too but arrive as
 *  ZodError, handled separately by callers that care. */
export function isExpectedError(message: string): boolean {
  return AUTH_MESSAGES.has(message) || FORBIDDEN_MESSAGES.has(message);
}

/**
 * Convert a thrown value into a JSON response.
 *
 * `context` is logged (never returned) so a 500 can be traced in Sentry /
 * Vercel logs without the client learning anything about internals.
 */
export function errorResponse(err: unknown, context: string): NextResponse {
  const message = err instanceof Error ? err.message : String(err);

  if (isExpectedError(message)) {
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }

  // Business-rule violations thrown by actions (e.g. "Payment not found",
  // "Loan already settled") are user-facing by design and carry no internal
  // detail, so they pass through as 400. Anything that looks like an
  // infrastructure fault is masked.
  if (looksInternal(message)) {
    console.error(`[api] ${context}:`, err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

/** Heuristic for "this came from the driver / runtime, not from us". */
function looksInternal(message: string): boolean {
  return (
    /violates|constraint|syntax error|relation ".*" does not exist|column .* does not exist/i.test(message) ||
    /ECONNREFUSED|ETIMEDOUT|fetch failed|socket hang up/i.test(message) ||
    message.length > 300
  );
}

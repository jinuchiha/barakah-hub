import { createHmac, timingSafeEqual, randomUUID } from 'crypto';

/**
 * One-tap approve links for supervisors: a signed, expiring token that
 * identifies (payment, approver) so the email/WhatsApp recipient can act
 * without logging in. HMAC-SHA256 over the payload with BETTER_AUTH_SECRET —
 * unforgeable without the server secret, and safe to put in a URL.
 *
 * The link lands on a PAGE (GET is read-only); the actual approval is a
 * POST from that page, so mail-scanner prefetches can never approve.
 */
export interface ApproveTokenPayload {
  /** payment id */
  p: string;
  /** approver member id */
  a: string;
  /** unix ms expiry */
  exp: number;
  /** token id — recorded in approve_token_uses at action time, making the
   *  token single-action. Tokens without one (pre-jti links) are invalid. */
  jti: string;
}

// 48 hours, down from 7 days. The link authorizes a money decision without
// a login; supervisors act on these within hours, and every extra day of
// validity is a day a forwarded email or leaked chat can still act.
const TTL_MS = 48 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error('BETTER_AUTH_SECRET missing');
  return s;
}

function hmac(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url');
}

export function signApproveToken(paymentId: string, approverId: string, now = Date.now()): string {
  const body = Buffer.from(
    JSON.stringify({ p: paymentId, a: approverId, exp: now + TTL_MS, jti: randomUUID() } satisfies ApproveTokenPayload),
  ).toString('base64url');
  return `${body}.${hmac(body)}`;
}

export function verifyApproveToken(token: string, now = Date.now()): ApproveTokenPayload | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let expected: Buffer;
  let given: Buffer;
  try {
    expected = Buffer.from(hmac(body));
    given = Buffer.from(sig);
  } catch {
    return null;
  }
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as ApproveTokenPayload;
    if (typeof payload.p !== 'string' || typeof payload.a !== 'string' || typeof payload.exp !== 'number') return null;
    if (typeof payload.jti !== 'string' || payload.jti.length < 16) return null;
    if (payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

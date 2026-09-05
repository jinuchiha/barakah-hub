import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

/**
 * Device PIN — v2.
 *
 * Storage format: `v2$<iterations>$<salt>$<hash>` in SecureStore (Android
 * Keystore / iOS Keychain encrypted at rest).
 *
 * What changed from v1 (single SHA-256 with the constant salt "bh_salt_",
 * plain `===` compare, permanent 3-attempt lockout):
 *
 *  · Per-device random 16-byte salt — no precomputed table works across
 *    devices, and two users with the same PIN store different hashes.
 *  · Iterated SHA-256 chain (expo-crypto has no PBKDF2/scrypt; a digest
 *    chain is the strongest primitive available without adding a native
 *    module). Honest scope: a 4-digit space is brute-forceable offline at
 *    ANY work factor — the real protections are the Keystore encryption
 *    around the stored hash and the persistent backoff below. The KDF
 *    raises the floor; it is not the wall.
 *  · Constant-time comparison.
 *  · Timed exponential backoff instead of a permanent 3-strike lockout:
 *    5 wrong attempts locks for 30s, doubling per subsequent failure up to
 *    15 minutes. Persisted in SecureStore, so relaunching the app does not
 *    reset it. Biometric success or re-login still clears it — there is no
 *    permanent lockout trap.
 *
 * v1 hashes verify transparently and upgrade to v2 on first success.
 */

const PIN_HASH_KEY = 'bh_pin_hash';
const PIN_ENABLED_KEY = 'bh_pin_enabled';
const PIN_ATTEMPTS_KEY = 'bh_pin_attempts';
const PIN_LOCK_UNTIL_KEY = 'bh_pin_lock_until';

export const MAX_ATTEMPTS_BEFORE_LOCK = 5;
const ITERATIONS = 2000;
const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 15 * 60_000;

async function randomSaltHex(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPinV2(pin: string, saltHex: string, iterations: number): Promise<string> {
  let digest = `${saltHex}:${pin}`;
  for (let i = 0; i < iterations; i++) {
    digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, digest);
  }
  return digest;
}

async function hashPinV1(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `bh_salt_${pin}`);
}

/** Constant-time hex-string comparison — no early exit on first mismatch. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function setPin(pin: string): Promise<void> {
  const salt = await randomSaltHex();
  const hash = await hashPinV2(pin, salt, ITERATIONS);
  await SecureStore.setItemAsync(PIN_HASH_KEY, `v2$${ITERATIONS}$${salt}$${hash}`);
  await SecureStore.setItemAsync(PIN_ENABLED_KEY, 'true');
  await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
  await SecureStore.deleteItemAsync(PIN_LOCK_UNTIL_KEY);
}

export async function isPinEnabled(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(PIN_ENABLED_KEY);
  return v === 'true';
}

/** Seconds until the timed lockout ends · 0 when not locked. */
export async function getPinLockoutSeconds(): Promise<number> {
  const raw = await SecureStore.getItemAsync(PIN_LOCK_UNTIL_KEY);
  if (!raw) return 0;
  const until = parseInt(raw, 10);
  if (!Number.isFinite(until)) return 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

async function registerFailure(attempts: number): Promise<'wrong' | 'locked'> {
  const next = attempts + 1;
  await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, String(next));
  if (next >= MAX_ATTEMPTS_BEFORE_LOCK) {
    const over = next - MAX_ATTEMPTS_BEFORE_LOCK;
    const lockMs = Math.min(BASE_LOCK_MS * 2 ** over, MAX_LOCK_MS);
    await SecureStore.setItemAsync(PIN_LOCK_UNTIL_KEY, String(Date.now() + lockMs));
    return 'locked';
  }
  return 'wrong';
}

export async function verifyPin(pin: string): Promise<'ok' | 'wrong' | 'locked' | 'not-set'> {
  if ((await getPinLockoutSeconds()) > 0) return 'locked';

  const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
  // No PIN configured is not a wrong guess — it must not consume attempts,
  // or a biometric-only user fumbling onto this path locks themselves out.
  if (!stored) return 'not-set';

  const attemptsRaw = await SecureStore.getItemAsync(PIN_ATTEMPTS_KEY);
  const attempts = attemptsRaw ? parseInt(attemptsRaw, 10) : 0;

  if (stored.startsWith('v2$')) {
    const [, iterRaw, salt, hash] = stored.split('$');
    const iterations = parseInt(iterRaw, 10);
    if (!Number.isFinite(iterations) || !salt || !hash) return 'not-set';
    const candidate = await hashPinV2(pin, salt, iterations);
    if (timingSafeEqualHex(candidate, hash)) {
      await resetPinAttempts();
      return 'ok';
    }
    return registerFailure(attempts);
  }

  // Legacy v1 hash — verify, then transparently upgrade to v2.
  const candidateV1 = await hashPinV1(pin);
  if (timingSafeEqualHex(candidateV1, stored)) {
    await resetPinAttempts();
    await setPin(pin);
    return 'ok';
  }
  return registerFailure(attempts);
}

export async function resetPinAttempts(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
  await SecureStore.deleteItemAsync(PIN_LOCK_UNTIL_KEY);
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await SecureStore.setItemAsync(PIN_ENABLED_KEY, 'false');
  await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
  await SecureStore.deleteItemAsync(PIN_LOCK_UNTIL_KEY);
}

export async function getPinAttempts(): Promise<number> {
  const v = await SecureStore.getItemAsync(PIN_ATTEMPTS_KEY);
  return v ? parseInt(v, 10) : 0;
}

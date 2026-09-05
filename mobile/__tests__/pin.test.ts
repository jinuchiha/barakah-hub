/**
 * PIN v2 regression tests — the KDF upgrade, timed backoff, legacy upgrade
 * path, and the not-set/no-punishment rule (a biometric-only user must
 * never be locked out by the PIN pad).
 */
import { createHash } from 'crypto';

// ── In-memory SecureStore ──
const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
  deleteItemAsync: jest.fn(async (k: string) => { mockStore.delete(k); }),
}));

// ── Real SHA-256 via node:crypto so hashes behave like the device ──
jest.mock('expo-crypto', () => {
  // Required lazily inside the factory — jest.mock factories cannot close
  // over module-scope imports.
  const nodeCrypto = require('crypto') as typeof import('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: jest.fn(async (_alg: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex')),
    getRandomBytesAsync: jest.fn(async (n: number) => Uint8Array.from(nodeCrypto.randomBytes(n))),
  };
});

import {
  setPin, verifyPin, isPinEnabled, clearPin, getPinAttempts,
  getPinLockoutSeconds, resetPinAttempts, MAX_ATTEMPTS_BEFORE_LOCK,
} from '../lib/pin';

beforeEach(() => {
  mockStore.clear();
  jest.useRealTimers();
});

describe('PIN v2', () => {
  it('set → verify round-trips', async () => {
    await setPin('1234');
    expect(await isPinEnabled()).toBe(true);
    expect(await verifyPin('1234')).toBe('ok');
  });

  it('stores a v2 record with per-device salt — same PIN, different hashes', async () => {
    await setPin('1234');
    const first = mockStore.get('bh_pin_hash')!;
    await setPin('1234');
    const second = mockStore.get('bh_pin_hash')!;
    expect(first.startsWith('v2$')).toBe(true);
    expect(second.startsWith('v2$')).toBe(true);
    expect(first).not.toBe(second);
    // Never the raw PIN, never the legacy constant-salt hash.
    expect(first).not.toContain('1234');
  });

  it('wrong PIN counts attempts; correct PIN resets them', async () => {
    await setPin('1234');
    expect(await verifyPin('0000')).toBe('wrong');
    expect(await verifyPin('1111')).toBe('wrong');
    expect(await getPinAttempts()).toBe(2);
    expect(await verifyPin('1234')).toBe('ok');
    expect(await getPinAttempts()).toBe(0);
  });

  it(`locks after ${MAX_ATTEMPTS_BEFORE_LOCK} failures — TIMED, not permanent`, async () => {
    await setPin('1234');
    for (let i = 0; i < MAX_ATTEMPTS_BEFORE_LOCK - 1; i++) {
      expect(await verifyPin('0000')).toBe('wrong');
    }
    expect(await verifyPin('0000')).toBe('locked');
    expect(await getPinLockoutSeconds()).toBeGreaterThan(0);
    expect(await getPinLockoutSeconds()).toBeLessThanOrEqual(30);
    // While locked, even the CORRECT pin is refused (online brute-force gate).
    expect(await verifyPin('1234')).toBe('locked');
  });

  it('lockout expires: after the window the correct PIN works again', async () => {
    await setPin('1234');
    for (let i = 0; i < MAX_ATTEMPTS_BEFORE_LOCK; i++) await verifyPin('0000');
    expect(await verifyPin('1234')).toBe('locked');
    // Simulate the wait by rewinding the stored lock timestamp.
    mockStore.set('bh_pin_lock_until', String(Date.now() - 1000));
    expect(await verifyPin('1234')).toBe('ok');
  });

  it('biometric success clears the lockout (resetPinAttempts)', async () => {
    await setPin('1234');
    for (let i = 0; i < MAX_ATTEMPTS_BEFORE_LOCK; i++) await verifyPin('0000');
    await resetPinAttempts();
    expect(await getPinLockoutSeconds()).toBe(0);
    expect(await verifyPin('1234')).toBe('ok');
  });

  it('no PIN configured → not-set, and consumes NO attempts', async () => {
    expect(await verifyPin('1234')).toBe('not-set');
    expect(await getPinAttempts()).toBe(0);
  });

  it('legacy v1 hash verifies and silently upgrades to v2', async () => {
    // v1 format: single SHA-256 of `bh_salt_<pin>`, bare hex in the mockStore.
    const legacy = createHash('sha256').update('bh_salt_9876').digest('hex');
    mockStore.set('bh_pin_hash', legacy);
    mockStore.set('bh_pin_enabled', 'true');

    expect(await verifyPin('9876')).toBe('ok');
    expect(mockStore.get('bh_pin_hash')!.startsWith('v2$')).toBe(true);
    expect(await verifyPin('9876')).toBe('ok');
  });

  it('legacy v1 hash still counts failures', async () => {
    const legacy = createHash('sha256').update('bh_salt_9876').digest('hex');
    mockStore.set('bh_pin_hash', legacy);
    expect(await verifyPin('0000')).toBe('wrong');
    expect(await getPinAttempts()).toBe(1);
  });

  it('clearPin wipes hash, attempts, and lockout', async () => {
    await setPin('1234');
    await verifyPin('0000');
    await clearPin();
    expect(await isPinEnabled()).toBe(false);
    expect(await verifyPin('1234')).toBe('not-set');
    expect(await getPinLockoutSeconds()).toBe(0);
  });
});

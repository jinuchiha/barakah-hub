import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PIN_HASH_KEY = 'bh_pin_hash';
const PIN_ENABLED_KEY = 'bh_pin_enabled';
const PIN_ATTEMPTS_KEY = 'bh_pin_attempts';
const MAX_ATTEMPTS = 3;

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `bh_salt_${pin}`);
}

export async function setPin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
  await SecureStore.setItemAsync(PIN_ENABLED_KEY, 'true');
  await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
}

export async function isPinEnabled(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(PIN_ENABLED_KEY);
  return v === 'true';
}

export async function verifyPin(pin: string): Promise<'ok' | 'wrong' | 'locked'> {
  const attemptsRaw = await SecureStore.getItemAsync(PIN_ATTEMPTS_KEY);
  const attempts = attemptsRaw ? parseInt(attemptsRaw, 10) : 0;

  if (attempts >= MAX_ATTEMPTS) return 'locked';

  const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (!stored) return 'wrong';

  const hash = await hashPin(pin);
  if (hash === stored) {
    await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
    return 'ok';
  }

  const next = attempts + 1;
  await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, String(next));
  if (next >= MAX_ATTEMPTS) return 'locked';
  return 'wrong';
}

export async function resetPinAttempts(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await SecureStore.setItemAsync(PIN_ENABLED_KEY, 'false');
  await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY);
}

export async function getPinAttempts(): Promise<number> {
  const v = await SecureStore.getItemAsync(PIN_ATTEMPTS_KEY);
  return v ? parseInt(v, 10) : 0;
}

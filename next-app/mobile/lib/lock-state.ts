import { isPinEnabled } from './pin';
import { isBiometricEnabled } from './security';

/**
 * In-memory "unlocked this launch" flag. Resets when the app process is
 * killed, so a cold start always re-locks if a lock method is enabled.
 * The session-timeout / background-return path clears it to force re-lock.
 */
let unlocked = false;

export function markUnlocked(): void {
  unlocked = true;
}

export function markLocked(): void {
  unlocked = false;
}

export function isUnlocked(): boolean {
  return unlocked;
}

export async function isLockEnabled(): Promise<boolean> {
  const [pin, bio] = await Promise.all([isPinEnabled(), isBiometricEnabled()]);
  return pin || bio;
}

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useSessionTimeout } from './useSessionTimeout';
import { isLockEnabled, isUnlocked, markLocked } from '@/lib/lock-state';

/**
 * Gates the authenticated app behind the lock screen.
 *  - Cold start: if a PIN or biometric is enabled and we haven't unlocked
 *    this launch, redirect to /lock and keep `ready=false` so the tabs
 *    don't flash underneath.
 *  - Inactivity / background-return: useSessionTimeout fires onLock, which
 *    clears the unlock flag and routes to /lock (only if a lock is enabled,
 *    so users without a lock are never trapped).
 */
export function useAppLock(active = true): { ready: boolean } {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    isLockEnabled()
      .then((enabled) => {
        if (cancelled) return;
        if (enabled && !isUnlocked()) {
          router.replace('/lock');
        } else {
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router, active]);

  const onLock = useCallback(() => {
    if (!active) return;
    isLockEnabled()
      .then((enabled) => {
        if (enabled) {
          markLocked();
          router.replace('/lock');
        }
      })
      .catch(() => undefined);
  }, [router, active]);

  useSessionTimeout(onLock);

  return { ready };
}

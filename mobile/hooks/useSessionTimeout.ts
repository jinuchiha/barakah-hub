import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TIMEOUT_KEY = 'bh_session_timeout_min';
const BG_TIME_KEY = 'bh_bg_timestamp';
const DEFAULT_TIMEOUT_MIN = 5;

export function useSessionTimeout(onLock: () => void): {
  resetTimer: () => void;
} {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getTimeoutMs = useCallback(async (): Promise<number> => {
    const raw = await SecureStore.getItemAsync(TIMEOUT_KEY);
    const min = raw ? parseInt(raw, 10) : DEFAULT_TIMEOUT_MIN;
    if (min === 0) return Infinity;
    return min * 60 * 1000;
  }, []);

  const scheduleTimer = useCallback(async () => {
    const ms = await getTimeoutMs();
    if (ms === Infinity) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onLock();
    }, ms);
  }, [getTimeoutMs, onLock]);

  const resetTimer = useCallback(() => {
    void scheduleTimer();
  }, [scheduleTimer]);

  useEffect(() => {
    void scheduleTimer();

    const handleChange = async (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        if (timerRef.current) clearTimeout(timerRef.current);
        await SecureStore.setItemAsync(BG_TIME_KEY, String(Date.now()));
      } else if (next === 'active') {
        const raw = await SecureStore.getItemAsync(BG_TIME_KEY);
        if (raw) {
          const elapsed = Date.now() - parseInt(raw, 10);
          const ms = await getTimeoutMs();
          if (ms !== Infinity && elapsed >= ms) {
            onLock();
            return;
          }
        }
        void scheduleTimer();
      }
    };

    const sub = AppState.addEventListener('change', (s) => void handleChange(s));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      sub.remove();
    };
  }, [scheduleTimer, getTimeoutMs, onLock]);

  return { resetTimer };
}

export async function setSessionTimeoutMinutes(min: number): Promise<void> {
  await SecureStore.setItemAsync(TIMEOUT_KEY, String(min));
}

export async function getSessionTimeoutMinutes(): Promise<number> {
  const raw = await SecureStore.getItemAsync(TIMEOUT_KEY);
  return raw ? parseInt(raw, 10) : DEFAULT_TIMEOUT_MIN;
}

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { isOnline } from './offline';

interface PollingOptions {
  queryKey: unknown[];
  intervalFocused?: number;
  intervalBackground?: number;
  enabled?: boolean;
}

export function useSmartPolling({
  queryKey,
  intervalFocused = 5000,
  intervalBackground = 30000,
  enabled = true,
}: PollingOptions): void {
  const qc = useQueryClient();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function scheduleNext(focused: boolean): void {
      timerRef.current = setTimeout(
        () => {
          if (isOnline()) {
            qc.invalidateQueries({ queryKey });
          }
          scheduleNext(appState.current === 'active');
        },
        focused ? intervalFocused : intervalBackground,
      );
    }

    scheduleNext(appState.current === 'active');

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      appState.current = next;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      scheduleNext(next === 'active');
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      sub.remove();
    };
  }, [qc, queryKey, intervalFocused, intervalBackground, enabled]);
}

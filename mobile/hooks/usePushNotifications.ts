import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/auth.store';
import { useAppStore } from '@/stores/app.store';
import {
  getExpoPushToken,
  registerPushToken,
  setBadgeCount,
} from '@/lib/push';
import { setupNotificationListeners } from '@/lib/notifications-handler';

export interface ForegroundNotification {
  title: string | null;
  body: string | null;
  id: string;
}

type ForegroundHandler = (n: ForegroundNotification) => void;

export function usePushNotifications(onForeground?: ForegroundHandler): void {
  const { isAuthenticated } = useAuthStore();
  const notificationCount = useAppStore((s) => s.notificationCount);
  const incrementNotificationCount = useAppStore((s) => s.incrementNotificationCount);
  // Keep the latest foreground handler without re-subscribing listeners.
  const onForegroundRef = useRef<ForegroundHandler | undefined>(onForeground);
  onForegroundRef.current = onForeground;

  // Register the push token once per auth session (not on every notification).
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      const token = await getExpoPushToken();
      if (!token || cancelled) return;
      try {
        await registerPushToken(token);
      } catch {
        // server unavailable — non-fatal
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Subscribe foreground/response listeners once per auth session.
  useEffect(() => {
    if (!isAuthenticated) return;
    const cleanup = setupNotificationListeners((notification) => {
      onForegroundRef.current?.({
        title: notification.request.content.title,
        body: notification.request.content.body,
        id: notification.request.identifier,
      });
      incrementNotificationCount();
    });
    return cleanup;
  }, [isAuthenticated, incrementNotificationCount]);

  useEffect(() => {
    void setBadgeCount(notificationCount);
  }, [notificationCount]);
}

export function useNotificationPermissionStatus(): Promise<boolean> {
  return Notifications.getPermissionsAsync().then(
    ({ status }) => status === 'granted',
  );
}

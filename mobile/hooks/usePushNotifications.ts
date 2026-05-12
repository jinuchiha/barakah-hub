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
  const { notificationCount, setNotificationCount } = useAppStore();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function setup(): Promise<void> {
      const token = await getExpoPushToken();
      if (!token || cancelled) return;

      try {
        await registerPushToken(token);
      } catch {
        // server unavailable — non-fatal
      }
    }

    void setup();

    cleanupRef.current = setupNotificationListeners((notification) => {
      if (onForeground) {
        onForeground({
          title: notification.request.content.title,
          body: notification.request.content.body,
          id: notification.request.identifier,
        });
      }
      setNotificationCount(notificationCount + 1);
    });

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, [isAuthenticated, onForeground, notificationCount, setNotificationCount]);

  useEffect(() => {
    void setBadgeCount(notificationCount);
  }, [notificationCount]);
}

export function useNotificationPermissionStatus(): Promise<boolean> {
  return Notifications.getPermissionsAsync().then(
    ({ status }) => status === 'granted',
  );
}

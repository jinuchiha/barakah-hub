import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

export type NotificationPayload = {
  type: 'case' | 'payment' | 'message' | 'admin' | string;
  id?: string;
  screen?: string;
};

function resolveRoute(data: NotificationPayload): string {
  if (data.type === 'case' && data.id) return `/(tabs)/cases`;
  if (data.type === 'payment' && data.id) return `/(tabs)/payments`;
  if (data.type === 'message') return `/notifications`;
  if (data.type === 'admin') return `/admin/`;
  return `/notifications`;
}

export function handleNotificationTap(
  notification: Notifications.Notification,
): void {
  const data = notification.request.content.data as NotificationPayload;
  if (!data) return;

  const route = resolveRoute(data);
  try {
    router.push(route as never);
  } catch {
    // navigation not ready — silently ignore
  }
}

export function setupNotificationListeners(
  onForeground: (notification: Notifications.Notification) => void,
): () => void {
  const foreground = Notifications.addNotificationReceivedListener(onForeground);

  const response = Notifications.addNotificationResponseReceivedListener(
    (r) => handleNotificationTap(r.notification),
  );

  return () => {
    foreground.remove();
    response.remove();
  };
}

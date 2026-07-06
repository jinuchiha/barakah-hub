import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

export type NotificationPayload = {
  type: 'case' | 'payment' | 'message' | 'admin' | string;
  id?: string;
  screen?: string;
};

export function resolveRoute(data: NotificationPayload): string {
  const type = data.type ?? '';
  // Match the type strings the web actually emits (lib/notify.ts + actions.ts):
  // payment-pending / payment-awaiting-admin / payment-rejected / payment-verified,
  // member-pending, msg, approved, case, vote-*.
  if (type.startsWith('payment')) return '/(tabs)/payments';
  if (type.startsWith('case') || type.startsWith('vote') || type.startsWith('emergency')) return '/(tabs)/cases';
  if (type === 'member-pending') return '/admin/approve-members';
  if (type === 'msg' || type === 'message') return '/messages';
  if (type === 'admin') return '/admin/';
  return '/notifications';
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

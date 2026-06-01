import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

/**
 * Headless component that registers the device's push token, wires
 * foreground notification handling, and polls the unread-count so the tab
 * badge stays fresh even when a push wasn't delivered. Mounted inside the
 * auth-gated tree in app/_layout.tsx. Renders nothing.
 */
export function PushManager() {
  usePushNotifications();
  useRealtimeNotifications();
  return null;
}

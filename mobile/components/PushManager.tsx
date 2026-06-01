import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Headless component that registers the device's push token and wires
 * foreground notification handling once the user is authenticated. Mounted
 * inside the auth-gated tree in app/_layout.tsx. Renders nothing.
 */
export function PushManager() {
  usePushNotifications();
  return null;
}

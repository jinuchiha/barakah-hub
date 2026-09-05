import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { loadReminderPrefs, applyReminderPrefs } from '@/lib/reminders';

/**
 * Headless component that registers the device's push token, wires
 * foreground notification handling, polls the unread-count (badge), and
 * (re)schedules local reminders — including the daily Quran verse with the
 * day's actual text. Mounted inside the auth-gated tree. Renders nothing.
 */
export function PushManager() {
  usePushNotifications();
  useRealtimeNotifications();

  useEffect(() => {
    // Re-schedule reminders on every launch so the daily verse rotates and
    // prayer one-shots stay current — but never pop the OS permission dialog
    // here: launch-time permission demands with no rationale are hostile UX
    // and a store-review risk. The dialog belongs in the reminders settings.
    applyReminderPrefs(loadReminderPrefs(), { requestPermission: false }).catch(() => undefined);
  }, []);

  return null;
}

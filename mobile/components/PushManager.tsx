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
    // Schedule reminders on every launch so the daily verse is set even for
    // users who never opened the reminders screen, and the verse rotates.
    applyReminderPrefs(loadReminderPrefs()).catch(() => undefined);
  }, []);

  return null;
}

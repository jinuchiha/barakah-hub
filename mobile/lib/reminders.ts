import * as Notifications from 'expo-notifications';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'reminders' });
const PREFS_KEY = 'reminder_prefs';

export interface ReminderPrefs {
  paymentReminder: boolean;
  paymentDay: number;
  dailyVerse: boolean;
  dailyVerseHour: number;
  dailyVerseMinute: number;
  prayerNotifications: boolean;
}

export const DEFAULT_PREFS: ReminderPrefs = {
  paymentReminder: true,
  paymentDay: 5,
  dailyVerse: true,
  dailyVerseHour: 7,
  dailyVerseMinute: 0,
  prayerNotifications: false,
};

export function loadReminderPrefs(): ReminderPrefs {
  try {
    const raw = storage.getString(PREFS_KEY);
    return raw ? ({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) }) : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveReminderPrefs(prefs: ReminderPrefs): void {
  storage.set(PREFS_KEY, JSON.stringify(prefs));
}

async function ensurePermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function schedulePaymentReminder(day: number): Promise<void> {
  if (!(await ensurePermission())) return;
  await Notifications.cancelScheduledNotificationAsync('payment-reminder').catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: 'payment-reminder',
    content: {
      title: 'Monthly Payment Due',
      body: 'Your Barakah Hub monthly contribution is due. Tap to pay now.',
      data: { screen: '/payments' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day,
      hour: 9,
      minute: 0,
    },
  });
}

export async function scheduleDailyVerse(hour: number, minute: number): Promise<void> {
  if (!(await ensurePermission())) return;
  await Notifications.cancelScheduledNotificationAsync('daily-verse').catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-verse',
    content: {
      title: 'Daily Reflection',
      body: 'Your daily Quran verse is ready. Bismillah.',
      data: { screen: '/' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelReminder(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}

export async function applyReminderPrefs(prefs: ReminderPrefs): Promise<void> {
  if (prefs.paymentReminder) {
    await schedulePaymentReminder(prefs.paymentDay);
  } else {
    await cancelReminder('payment-reminder');
  }
  if (prefs.dailyVerse) {
    await scheduleDailyVerse(prefs.dailyVerseHour, prefs.dailyVerseMinute);
  } else {
    await cancelReminder('daily-verse');
  }
}

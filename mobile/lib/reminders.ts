import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { MMKV } from 'react-native-mmkv';
import { getDailyVerse } from './quran';

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
  // Carry the day's actual verse text. Rescheduled on each app open (see
  // PushManager) so the verse rotates daily.
  const verse = getDailyVerse();
  const body = verse.english.length > 160 ? `${verse.english.slice(0, 157)}…` : verse.english;
  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-verse',
    content: {
      title: '🌙 Daily Reflection',
      body,
      subtitle: verse.reference,
      data: { screen: '/', type: 'daily-verse' },
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

const PRAYER_IDS = ['prayer-fajr', 'prayer-dhuhr', 'prayer-asr', 'prayer-maghrib', 'prayer-isha'] as const;
type PrayerId = typeof PRAYER_IDS[number];

interface AlAdhanTimings { Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string }
interface AlAdhanResponse { data: { timings: AlAdhanTimings } }

const PRAYER_META: { id: PrayerId; key: keyof AlAdhanTimings; title: string }[] = [
  { id: 'prayer-fajr',    key: 'Fajr',    title: 'Fajr Prayer'    },
  { id: 'prayer-dhuhr',   key: 'Dhuhr',   title: 'Dhuhr Prayer'   },
  { id: 'prayer-asr',     key: 'Asr',     title: 'Asr Prayer'     },
  { id: 'prayer-maghrib', key: 'Maghrib', title: 'Maghrib Prayer' },
  { id: 'prayer-isha',    key: 'Isha',    title: 'Isha Prayer'    },
];

async function cancelAllPrayerNotifications(): Promise<void> {
  await Promise.all(PRAYER_IDS.map((id) => cancelReminder(id)));
}

export async function schedulePrayerNotifications(): Promise<void> {
  if (!(await ensurePermission())) return;
  await cancelAllPrayerNotifications();

  // Try bh_city first, then fall back to the city stored in the user profile JSON.
  let city = await SecureStore.getItemAsync('bh_city').catch(() => null);
  if (!city) {
    const userJson = await SecureStore.getItemAsync('bh_user').catch(() => null);
    if (userJson) {
      try {
        const storedUser = JSON.parse(userJson) as { city?: string };
        city = storedUser?.city ?? null;
      } catch {
        // malformed JSON — ignore
      }
    }
  }
  city = city || 'Karachi';
  const today = new Date();
  const datePath = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
  const url = `https://api.aladhan.com/v1/timingsByCity/${datePath}?city=${encodeURIComponent(city)}&country=Pakistan&method=1`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`AlAdhan API error: ${res.status}`);
  const json: AlAdhanResponse = await res.json();
  const timings = json.data.timings;

  await Promise.all(
    PRAYER_META.map(({ id, key, title }) => {
      const [hourStr, minuteStr] = timings[key].split(':');
      const hour = parseInt(hourStr ?? '0', 10);
      const minute = parseInt(minuteStr ?? '0', 10);
      return Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title,
          body: 'It is time for prayer. May Allah accept your ibadah.',
          data: { screen: '/', type: 'prayer' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }),
  );
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
  if (prefs.prayerNotifications) {
    await schedulePrayerNotifications();
  } else {
    await cancelAllPrayerNotifications();
  }
}

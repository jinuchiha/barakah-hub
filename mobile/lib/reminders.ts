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

/**
 * `request: false` only checks the existing grant — used on app launch,
 * where popping the OS permission dialog with no context is both hostile
 * UX and a store-review risk. The dialog is shown only from the reminders
 * settings screen, where the user has just asked for reminders.
 */
async function ensurePermission(request: boolean): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!request) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function schedulePaymentReminder(day: number, requestPermission = true): Promise<void> {
  if (!(await ensurePermission(requestPermission))) return;
  await Notifications.cancelScheduledNotificationAsync('payment-reminder').catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: 'payment-reminder',
    content: {
      title: 'Monthly Payment Due',
      body: 'Your Barakah monthly contribution is due. Tap to pay now.',
      // resolveRoute (notifications-handler.ts) branches on `type`, not
      // `screen` — without it this reminder dead-ends on /notifications.
      data: { screen: '/payments', type: 'pledge-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day,
      hour: 9,
      minute: 0,
    },
  });
}

export async function scheduleDailyVerse(hour: number, minute: number, requestPermission = true): Promise<void> {
  if (!(await ensurePermission(requestPermission))) return;
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

interface AlAdhanTimings { Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string }
interface AlAdhanResponse { data: { timings: AlAdhanTimings } }

const PRAYER_META: { slug: string; key: keyof AlAdhanTimings; title: string }[] = [
  { slug: 'fajr',    key: 'Fajr',    title: 'Fajr Prayer'    },
  { slug: 'dhuhr',   key: 'Dhuhr',   title: 'Dhuhr Prayer'   },
  { slug: 'asr',     key: 'Asr',     title: 'Asr Prayer'     },
  { slug: 'maghrib', key: 'Maghrib', title: 'Maghrib Prayer' },
  { slug: 'isha',    key: 'Isha',    title: 'Isha Prayer'    },
];

async function cancelAllPrayerNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith('prayer-'))
      .map((n) => cancelReminder(n.identifier)),
  );
}

async function fetchTimings(city: string, date: Date): Promise<AlAdhanTimings> {
  const datePath = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  // method 1 = Univ. of Islamic Sciences Karachi, school 1 = Hanafi Asr —
  // the same convention as the dashboard widget and the web app.
  const url = `https://api.aladhan.com/v1/timingsByCity/${datePath}?city=${encodeURIComponent(city)}&country=Pakistan&method=1&school=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`AlAdhan API error: ${res.status}`);
  const json: AlAdhanResponse = await res.json();
  return json.data.timings;
}

/**
 * Prayer alerts are scheduled as dated one-shots for today and tomorrow,
 * refreshed on every app open (PushManager). Prayer times move 1–2 hours
 * across the year, so a repeating DAILY trigger frozen at one day's times
 * silently drifts wrong; with one-shots, a user who does not open the app
 * simply stops getting alerts instead of getting incorrect ones.
 */
export async function schedulePrayerNotifications(requestPermission = true): Promise<void> {
  if (!(await ensurePermission(requestPermission))) return;
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

  const now = new Date();
  const days = [0, 1]; // today + tomorrow
  for (const offset of days) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    let timings: AlAdhanTimings;
    try {
      timings = await fetchTimings(city, day);
    } catch {
      continue; // offline or API down — skip this day, keep what we have
    }
    await Promise.all(
      PRAYER_META.map(({ slug, key, title }) => {
        const raw = timings[key];
        if (!raw) return Promise.resolve();
        const [hourStr, minuteStr] = raw.split(':');
        const at = new Date(day);
        at.setHours(parseInt(hourStr ?? '0', 10), parseInt(minuteStr ?? '0', 10), 0, 0);
        if (at.getTime() <= now.getTime()) return Promise.resolve(); // already passed
        return Notifications.scheduleNotificationAsync({
          identifier: `prayer-${slug}-${offset}`,
          content: {
            title,
            body: 'It is time for prayer. May Allah accept your ibadah.',
            data: { screen: '/', type: 'prayer' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: at,
          },
        });
      }),
    );
  }
}

export async function applyReminderPrefs(
  prefs: ReminderPrefs,
  opts: { requestPermission?: boolean } = {},
): Promise<void> {
  const request = opts.requestPermission ?? true;
  if (prefs.paymentReminder) {
    await schedulePaymentReminder(prefs.paymentDay, request);
  } else {
    await cancelReminder('payment-reminder');
  }
  if (prefs.dailyVerse) {
    await scheduleDailyVerse(prefs.dailyVerseHour, prefs.dailyVerseMinute, request);
  } else {
    await cancelReminder('daily-verse');
  }
  if (prefs.prayerNotifications) {
    await schedulePrayerNotifications(request);
  } else {
    await cancelAllPrayerNotifications();
  }
}

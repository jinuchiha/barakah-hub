import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '@/lib/useTheme';
import { useAuthStore } from '@/stores/auth.store';
import { spacing, radius } from '@/lib/theme';

interface PrayerTime {
  name: string;
  time: string;
  icon: string;
}

interface AlAdhanTimings {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface AlAdhanResponse {
  data: { timings: AlAdhanTimings };
}

const PRAYER_ICONS: Record<string, string> = {
  Fajr: 'weather-sunset-up',
  Dhuhr: 'weather-sunny',
  Asr: 'weather-partly-cloudy',
  Maghrib: 'weather-sunset-down',
  Isha: 'weather-night',
};

const FALLBACK_CITY = 'Karachi';
const FALLBACK_COUNTRY = 'Pakistan';

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = (h ?? 0) >= 12 ? 'PM' : 'AM';
  const hour = (h ?? 0) % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Resolve which location to query the AlAdhan API with.
 *
 *  1. If we have GPS permission already granted, use coordinates —
 *     most accurate (matches actual position, not just city centre).
 *  2. Else if the user has set a `city` in their profile, use that.
 *  3. Else fall back to Karachi/Pakistan so the widget never breaks.
 *
 * Returns both the query URL and a friendly label for the UI header.
 */
async function resolveLocation(profileCity: string | null | undefined): Promise<{ url: string; label: string }> {
  const today = new Date();
  const d = today.getDate();
  const mo = today.getMonth() + 1;
  const y = today.getFullYear();
  const datePath = `${d}-${mo}-${y}`;

  // Method 1 (Karachi-style ISNA). Could be made user-configurable later.
  const method = 1;

  // Try GPS first if permission is already granted (don't prompt — that
  // belongs in a settings flow, not on every dashboard render).
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status === 'granted') {
      const pos = await Location.getLastKnownPositionAsync({ maxAge: 60 * 60_000 });
      if (pos) {
        const { latitude, longitude } = pos.coords;
        return {
          url: `https://api.aladhan.com/v1/timings/${datePath}?latitude=${latitude}&longitude=${longitude}&method=${method}`,
          label: 'Current location',
        };
      }
    }
  } catch {
    // ignore — fall through to city fallback
  }

  const city = profileCity?.trim() || FALLBACK_CITY;
  return {
    url: `https://api.aladhan.com/v1/timingsByCity/${datePath}?city=${encodeURIComponent(city)}&country=${FALLBACK_COUNTRY}&method=${method}`,
    label: city,
  };
}

export function PrayerTimesWidget() {
  const { colors } = useTheme();
  const profileCity = useAuthStore((s) => s.user?.city);
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [locationLabel, setLocationLabel] = useState<string>(profileCity ?? FALLBACK_CITY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      const { url, label } = await resolveLocation(profileCity);
      if (cancelled) return;
      setLocationLabel(label);
      try {
        const res = await fetch(url);
        const json: AlAdhanResponse = await res.json();
        if (cancelled) return;
        const t = json.data.timings;
        setPrayers([
          { name: 'Fajr',    time: formatTime(t.Fajr),    icon: PRAYER_ICONS['Fajr']    ?? '' },
          { name: 'Dhuhr',   time: formatTime(t.Dhuhr),   icon: PRAYER_ICONS['Dhuhr']   ?? '' },
          { name: 'Asr',     time: formatTime(t.Asr),     icon: PRAYER_ICONS['Asr']     ?? '' },
          { name: 'Maghrib', time: formatTime(t.Maghrib), icon: PRAYER_ICONS['Maghrib'] ?? '' },
          { name: 'Isha',    time: formatTime(t.Isha),    icon: PRAYER_ICONS['Isha']    ?? '' },
        ]);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profileCity]);

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.card, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}>
        <Text style={[styles.errorText, { color: colors.text3 }]}>Prayer times unavailable</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="mosque" size={18} color={colors.gold} />
        <Text style={[styles.cardTitle, { color: colors.text1 }]}>Prayer Times</Text>
        <Text style={[styles.location, { color: colors.text4 }]}>{locationLabel}</Text>
      </View>
      <View style={styles.grid}>
        {prayers.map((p) => (
          <View key={p.name} style={styles.prayerItem}>
            <MaterialCommunityIcons name={p.icon as never} size={16} color={colors.gold} />
            <Text style={[styles.prayerName, { color: colors.text3 }]}>{p.name}</Text>
            <Text style={[styles.prayerTime, { color: colors.text1 }]}>{p.time}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.xxl,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  location: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  prayerItem: { alignItems: 'center', gap: 4, minWidth: 56 },
  prayerName: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  prayerTime: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', padding: spacing.sm },
});

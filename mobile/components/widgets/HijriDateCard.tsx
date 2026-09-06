import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

function toHijri(date: Date): { day: number; month: number; year: number } {
  // Prefer the Umm al-Qura calendar via Intl — the same calendar the web app
  // and the server's annual report use, so all surfaces show one date.
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    }).formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const day = get('day'); const month = get('month'); const year = get('year');
    if (day && month && year) return { day, month, year };
  } catch { /* engine lacks islamic-umalqura → tabular fallback below */ }

  // Tabular (Kuwaiti) fallback — ±1-2 days vs Umm al-Qura.
  // JDN at noon for the Unix epoch is 2440588 (not 2440587.5-then-floor,
  // which lands one day early).
  const jd = Math.floor(date.getTime() / 86400000) + 2440588;
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const ll = l - 10631 * n + 354;
  const j = Math.floor((10985 - ll) / 5316) * Math.floor((50 * ll) / 17719)
    + Math.floor(ll / 5670) * Math.floor((43 * ll) / 15238);
  const lll = ll - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
    - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * lll) / 709);
  const day = lll - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { day, month: month + 1, year };
}

export function HijriDateCard() {
  const { colors } = useTheme();
  const hijri = useMemo(() => toHijri(new Date()), []);
  const monthName = HIJRI_MONTHS[Math.min(Math.max(hijri.month, 1), 12) - 1];

  return (
    <View style={[styles.card, { borderColor: colors.border2 }]}>
      <LinearGradient
        colors={[colors.goldDim, 'transparent']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <MaterialCommunityIcons name="calendar-star" size={20} color={colors.gold} />
      <View>
        <Text style={[styles.day, { color: colors.gold }]}>{hijri.day} {monthName}</Text>
        <Text style={[styles.year, { color: colors.text3 }]}>{hijri.year} AH · ±1 day by moon sighting</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 160,
  },
  day: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  year: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
});

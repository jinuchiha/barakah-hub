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
  // Approximation using epoch offset (good to ±1 day)
  const jd = Math.floor(date.getTime() / 86400000) + 2440587.5;
  const l = Math.floor(jd) - 1948440 + 10632;
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
  const monthName = HIJRI_MONTHS[(hijri.month - 1) % 12];

  return (
    <View style={[styles.card, { borderColor: colors.goldDim }]}>
      <LinearGradient
        colors={[colors.goldDim, 'transparent']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <MaterialCommunityIcons name="calendar-star" size={20} color={colors.gold} />
      <View>
        <Text style={[styles.day, { color: colors.gold }]}>{hijri.day} {monthName}</Text>
        <Text style={[styles.year, { color: colors.text3 }]}>{hijri.year} AH</Text>
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

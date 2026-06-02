import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import { HijriDateCard } from '@/components/widgets/HijriDateCard';
import { PrayerTimesWidget } from '@/components/widgets/PrayerTimesWidget';
import { QiblaCompass } from '@/components/widgets/QiblaCompass';
import { ZakatCalculator } from '@/components/widgets/ZakatCalculator';

export default function IslamicToolsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>Islamic Tools</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.hijriWrap}>
          <HijriDateCard />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <Text style={[styles.sectionTitle, { color: colors.text4 }]}>TODAY'S PRAYERS</Text>
          <PrayerTimesWidget />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(160)} style={styles.compassSection}>
          <Text style={[styles.sectionTitle, { color: colors.text4 }]}>QIBLA</Text>
          <QiblaCompass />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(240)}>
          <Text style={[styles.sectionTitle, { color: colors.text4 }]}>ZAKAT</Text>
          <ZakatCalculator />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  hijriWrap: { alignItems: 'flex-start' },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  compassSection: {},
});

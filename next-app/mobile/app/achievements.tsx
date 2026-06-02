import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import { ACHIEVEMENTS, getUnlockedIds, getTotalPoints } from '@/lib/achievements';
import { AchievementBadge } from '@/components/AchievementBadge';

export default function AchievementsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const unlockedIds = useMemo(() => getUnlockedIds(), []);
  const totalPoints = useMemo(() => getTotalPoints(), []);
  const unlockedCount = unlockedIds.length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>Achievements</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={[styles.statsCard, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}>
            <LinearGradient
              colors={[colors.primaryDim, 'transparent']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{unlockedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.text3 }]}>Unlocked</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border1 }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gold }]}>{totalPoints}</Text>
              <Text style={[styles.statLabel, { color: colors.text3 }]}>Points</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border1 }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>{ACHIEVEMENTS.length}</Text>
              <Text style={[styles.statLabel, { color: colors.text3 }]}>Total</Text>
            </View>
          </View>
        </Animated.View>

        <Text style={[styles.sectionTitle, { color: colors.text4 }]}>ALL ACHIEVEMENTS</Text>

        {ACHIEVEMENTS.map((achievement, i) => (
          <Animated.View key={achievement.id} entering={FadeInDown.duration(300).delay(i * 50)}>
            <AchievementBadge.Card
              achievement={achievement}
              unlocked={unlockedIds.includes(achievement.id)}
            />
          </Animated.View>
        ))}
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
  scroll: { padding: spacing.md, paddingBottom: 100 },
  statsCard: {
    flexDirection: 'row',
    padding: spacing.xl,
    borderRadius: radius.xxl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 2, letterSpacing: 0.5 },
  divider: { width: 1, marginVertical: 4 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
});

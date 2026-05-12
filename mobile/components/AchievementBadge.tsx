import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
  withTiming, interpolate,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import type { Achievement } from '@/lib/achievements';

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  animate?: boolean;
}

export function AchievementBadge({ achievement, unlocked, animate = false }: AchievementBadgeProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (animate && unlocked) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 12 }),
      );
      shimmer.value = withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0, { duration: 400 }),
      );
    }
  }, [animate, unlocked, scale, shimmer]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0, 0.8]),
  }));

  const iconColor = unlocked ? achievement.color : colors.text4;
  const bg = unlocked ? `${achievement.color}20` : colors.glass1;
  const border = unlocked ? `${achievement.color}40` : colors.border1;

  return (
    <Animated.View style={[styles.wrapper, scaleStyle]}>
      <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
        {unlocked ? (
          <LinearGradient
            colors={[`${achievement.color}15`, 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.shimmerOverlay, shimmerStyle]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['transparent', achievement.color, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
        <MaterialCommunityIcons name={achievement.icon as never} size={28} color={iconColor} />
      </View>
      <Text style={[styles.points, { color: unlocked ? achievement.color : colors.text4 }]}>
        {unlocked ? `+${achievement.points}` : '???'}
      </Text>
    </Animated.View>
  );
}

function AchievementCard({
  achievement,
  unlocked,
}: {
  achievement: Achievement;
  unlocked: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.glass2, borderColor: unlocked ? `${achievement.color}30` : colors.border1 }]}>
      <AchievementBadge achievement={achievement} unlocked={unlocked} />
      <View style={styles.info}>
        <Text style={[styles.title, { color: unlocked ? colors.text1 : colors.text3 }]}>
          {achievement.titleKey.split('.')[1]?.replace(/([A-Z])/g, ' $1').trim() ?? achievement.id}
        </Text>
        <Text style={[styles.desc, { color: colors.text4 }]} numberOfLines={2}>
          {unlocked ? achievement.description : 'Keep contributing to unlock'}
        </Text>
      </View>
    </View>
  );
}

AchievementBadge.Card = AchievementCard;

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 4 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shimmerOverlay: { borderRadius: radius.xl },
  points: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  desc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2, lineHeight: 17 },
});

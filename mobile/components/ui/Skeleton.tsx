import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.glass2, colors.glass3],
    ),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          overflow: 'hidden',
        },
        animStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[skStyles.card, style]}>
      <View style={skStyles.row}>
        <Skeleton width={24} height={24} borderRadius={6} />
        <Skeleton width={80} height={10} />
      </View>
      <Skeleton width={120} height={22} style={{ marginTop: 10 }} borderRadius={6} />
      <Skeleton width={60} height={9} style={{ marginTop: 6 }} />
    </View>
  );
}

export function SkeletonListItem() {
  return (
    <View style={skStyles.listItem}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={skStyles.listContent}>
        <Skeleton width={140} height={12} />
        <Skeleton width={90} height={10} style={{ marginTop: 5 }} />
      </View>
      <Skeleton width={60} height={12} borderRadius={6} />
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  listContent: { flex: 1, gap: 2 },
});

import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';
import { radius } from '@/lib/theme';

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
  showGlow?: boolean;
}

export function ProgressBar({
  progress,
  color,
  height = 6,
  style,
  showGlow = false,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const barColor = color ?? colors.primary;
  const width = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    // Animate 0→1 scale instead of 0→100% width — scaleX is GPU-only and
    // avoids layout recalculation on Android which causes freeze in FlashList
    width.value = withTiming(clamped, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: width.value }],
  }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: colors.bg4 }, style]}>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: barColor, height, borderRadius: height / 2, transformOrigin: 'left' },
          showGlow && {
            shadowColor: barColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: radius.full,
  },
});

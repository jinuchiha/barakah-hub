import React, { useEffect, useState } from 'react';
import { View, StyleSheet, type ViewStyle, type LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
  showGlow?: boolean;
}

export function ProgressBar({ progress, color, height = 6, style, showGlow = false }: ProgressBarProps) {
  const { colors } = useTheme();
  const barColor = color ?? colors.primary;
  const [trackWidth, setTrackWidth] = useState(0);
  const animWidth = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    if (trackWidth <= 0) return;
    animWidth.value = withTiming(clamped * trackWidth, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, trackWidth, animWidth]);

  const animStyle = useAnimatedStyle(() => ({ width: animWidth.value }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setTrackWidth(w);
      animWidth.value = clamped * w;
    }
  };

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: colors.bg4 }, style]}
      onLayout={onLayout}
    >
      <Animated.View
        style={[
          { backgroundColor: barColor, height, borderRadius: height / 2 },
          showGlow && { shadowColor: barColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4 },
          animStyle,
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
});

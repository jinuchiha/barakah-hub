import React, { useEffect } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';
import { radius } from '@/lib/theme';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  pulse?: boolean;
}

function usePulse(active: boolean) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!active) return;
    opacity.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false,
    );
    return () => {
      opacity.value = 1;
    };
  }, [active, opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

export function Badge({ label, variant = 'neutral', style, pulse = false }: BadgeProps) {
  const { colors } = useTheme();
  const pulseStyle = usePulse(pulse);

  const variantMap = getVariantMap(colors);
  const vc = variantMap[variant];

  return (
    <Animated.View style={pulse ? pulseStyle : undefined}>
      <View style={[styles.badge, { backgroundColor: vc.bg, borderColor: vc.border }, style]}>
        <View style={[styles.dot, { backgroundColor: vc.text }]} />
        <Text style={[styles.text, { color: vc.text }]}>{label}</Text>
      </View>
    </Animated.View>
  );
}

type Colors = ReturnType<typeof useTheme>['colors'];

function getVariantMap(c: Colors) {
  return {
    success: { bg: c.primaryDim, border: c.primary, text: c.primary },
    warning: { bg: c.goldDim, border: c.gold, text: c.gold },
    danger: { bg: c.dangerDim, border: c.danger, text: c.danger },
    info: { bg: c.accentDim, border: c.accent, text: c.accent },
    neutral: { bg: c.glass2, border: c.border1, text: c.text3 },
    gold: { bg: c.goldDim, border: c.gold, text: c.gold },
  };
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 5,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
});

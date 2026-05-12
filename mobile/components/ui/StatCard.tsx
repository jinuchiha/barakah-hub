import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from './GlassCard';
import { useTheme } from '@/lib/useTheme';
import { spacing } from '@/lib/theme';

interface StatCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string | number;
  label: string;
  iconColor?: string;
  style?: ViewStyle;
  trend?: { direction: 'up' | 'down'; percent: number };
}

function useCountUp(target: number, isNumeric: boolean) {
  const val = useSharedValue(isNumeric ? 0 : target);

  useEffect(() => {
    if (!isNumeric) return;
    val.value = withTiming(target, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [target, isNumeric, val]);

  return val;
}

export function StatCard({ icon, value, label, iconColor, style, trend }: StatCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const isNumeric = typeof value === 'number' || /^\d/.test(String(value));
  const displayValue = isNumeric ? numericValue : 0;
  void useCountUp(displayValue, isNumeric);

  const color = iconColor ?? colors.primary;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <GlassCard elevated style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: `${color}22` }]}>
            <MaterialCommunityIcons name={icon} size={22} color={color} />
          </View>
          <Text style={[styles.value, { color: colors.text1 }]}>{String(value)}</Text>
          <Text style={[styles.label, { color: colors.text3 }]}>{label}</Text>
          {trend ? (
            <View style={styles.trendRow}>
              <MaterialCommunityIcons
                name={trend.direction === 'up' ? 'trending-up' : 'trending-down'}
                size={14}
                color={trend.direction === 'up' ? colors.primary : colors.danger}
              />
              <Text style={[styles.trendText, { color: trend.direction === 'up' ? colors.primary : colors.danger }]}>
                {trend.percent}%
              </Text>
            </View>
          ) : null}
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    textAlign: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  trendText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
});

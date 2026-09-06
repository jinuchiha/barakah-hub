import React from 'react';
import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { radius } from '@/lib/theme';
import { AnimatedNumber } from './AnimatedNumber';

interface StatCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string | number;
  label: string;
  iconColor?: string;
  style?: ViewStyle;
  trend?: { direction: 'up' | 'down'; percent: number };
  onPress?: () => void;
  /** When set, the value counts up live (web-style) instead of static text. */
  animateValue?: number;
  /** Worklet formatter for animateValue (e.g. fmtRsWorklet). */
  format?: (v: number) => string;
}

export function StatCard({ icon, value, label, iconColor, style, trend, onPress, animateValue, format }: StatCardProps) {
  const { colors } = useTheme();
  const color = iconColor ?? colors.primary;
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 20, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 20, stiffness: 400 }); }}
      onPress={onPress}
      style={[style, { borderRadius: radius.lg, overflow: 'hidden' }]}
    >
      <Animated.View style={[animStyle, { borderRadius: radius.lg, overflow: 'hidden' }]}>
        <View style={[styles.card, { borderColor: colors.border1 }]}>
          <LinearGradient colors={[colors.surfaceGradA, colors.surfaceGradB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
          <View style={[styles.sheen, { backgroundColor: colors.sheen }]} pointerEvents="none" />
          <View style={styles.header}>
            <Text style={[styles.label, { color: colors.text3 }]} numberOfLines={1}>{label}</Text>
            <MaterialCommunityIcons name={icon} size={15} color={color} />
          </View>
          {animateValue !== undefined ? (
            <AnimatedNumber value={animateValue} format={format} style={[styles.value, { color: colors.text1 }]} />
          ) : (
            <Text style={[styles.value, { color: colors.text1 }]} numberOfLines={1}>{String(value)}</Text>
          )}
          {trend ? (
            <View style={[styles.trendPill, { backgroundColor: trend.direction === 'up' ? 'rgba(45,138,95,0.15)' : 'rgba(220,82,82,0.15)', marginTop: 8 }]}>
              <MaterialCommunityIcons name={trend.direction === 'up' ? 'arrow-up' : 'arrow-down'} size={10} color={trend.direction === 'up' ? colors.success : colors.danger} />
              <Text style={[styles.trendText, { color: trend.direction === 'up' ? colors.success : colors.danger }]}>{trend.percent}%</Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 96, borderRadius: radius.lg, borderWidth: 1, padding: 14, overflow: 'hidden', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
  },
  sheen: { position: 'absolute', top: 0, left: 10, right: 10, height: StyleSheet.hairlineWidth * 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 11, fontFamily: 'Inter_400Regular', letterSpacing: 0.2, flex: 1 },
  value: { fontSize: 23, fontFamily: 'Inter_700Bold', letterSpacing: -0.7, lineHeight: 29, fontVariant: ['tabular-nums'] },
  trendPill: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20 },
  trendText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
});

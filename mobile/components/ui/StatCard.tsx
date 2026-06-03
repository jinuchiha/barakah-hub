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

interface StatCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string | number;
  label: string;
  iconColor?: string;
  style?: ViewStyle;
  trend?: { direction: 'up' | 'down'; percent: number };
  onPress?: () => void;
}

export function StatCard({ icon, value, label, iconColor, style, trend, onPress }: StatCardProps) {
  const { colors } = useTheme();
  const color = iconColor ?? colors.primary;
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animStyle]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 20, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20, stiffness: 400 }); }}
        onPress={onPress}
        style={{ borderRadius: radius.lg, overflow: 'hidden' }}
      >
        <View style={[styles.card, { backgroundColor: colors.bg1, borderColor: `${color}22` }]}>
          <LinearGradient colors={[`${color}15`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1.5, y: 1.5 }} style={StyleSheet.absoluteFillObject} />
          <View style={styles.header}>
            <Text style={[styles.label, { color: colors.text3 }]} numberOfLines={1}>{label}</Text>
            <View style={[styles.iconPill, { backgroundColor: `${color}18`, borderColor: `${color}28` }]}>
              <MaterialCommunityIcons name={icon} size={13} color={color} />
            </View>
          </View>
          <Text style={[styles.value, { color: colors.text1 }]} numberOfLines={1}>{String(value)}</Text>
          {trend ? (
            <View style={[styles.trendPill, { backgroundColor: trend.direction === 'up' ? 'rgba(45,138,95,0.15)' : 'rgba(220,82,82,0.15)', marginTop: 8 }]}>
              <MaterialCommunityIcons name={trend.direction === 'up' ? 'arrow-up' : 'arrow-down'} size={10} color={trend.direction === 'up' ? colors.success : colors.danger} />
              <Text style={[styles.trendText, { color: trend.direction === 'up' ? colors.success : colors.danger }]}>{trend.percent}%</Text>
            </View>
          ) : null}
          <View style={[styles.bottomLine, { backgroundColor: color }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 96, borderRadius: radius.lg, borderWidth: 1, padding: 14, overflow: 'hidden', position: 'relative' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 10.5, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 },
  iconPill: { width: 24, height: 24, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 22, fontFamily: 'SpaceMono_400Regular', fontWeight: '600', letterSpacing: -0.5, lineHeight: 28 },
  trendPill: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20 },
  trendText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  bottomLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, opacity: 0.6 },
});

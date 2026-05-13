import React from 'react';
import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

interface StatCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string | number;
  label: string;
  iconColor?: string;
  style?: ViewStyle;
  trend?: { direction: 'up' | 'down'; percent: number };
}

export function StatCard({ icon, value, label, iconColor, style, trend }: StatCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const color = iconColor ?? colors.primary;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.985, { damping: 20, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  };

  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.bg1, borderColor: colors.border1 },
          ]}
        >
          <View style={[styles.rail, { backgroundColor: color }]} pointerEvents="none" />

          <View style={styles.headerRow}>
            <Text style={[styles.label, { color: colors.text3 }]} numberOfLines={1}>
              {label}
            </Text>
            <View style={[styles.iconBox, { backgroundColor: `${color}1F` }]}>
              <MaterialCommunityIcons name={icon} size={15} color={color} />
            </View>
          </View>

          <Text style={[styles.value, { color: colors.text1 }]} numberOfLines={1}>
            {String(value)}
          </Text>

          {trend ? (
            <View style={styles.trendRow}>
              <MaterialCommunityIcons
                name={trend.direction === 'up' ? 'trending-up' : 'trending-down'}
                size={12}
                color={trend.direction === 'up' ? colors.success : colors.danger}
              />
              <Text
                style={[
                  styles.trendText,
                  { color: trend.direction === 'up' ? colors.success : colors.danger },
                ]}
              >
                {trend.percent}%
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 104,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.md + 3,
    paddingRight: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 20,
    fontFamily: 'SpaceMono_400Regular',
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  trendText: {
    fontSize: 11,
    fontFamily: 'SpaceMono_400Regular',
    fontWeight: '600',
  },
});

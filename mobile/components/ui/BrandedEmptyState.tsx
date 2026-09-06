import React, { useEffect } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle,
} from 'react-native-reanimated';
import { Button } from './Button';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Mark } from './Mark';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

interface BrandedEmptyStateProps {
  type?: 'payments' | 'cases' | 'loans' | 'messages' | 'members' | 'generic' | 'search' | 'notifications';
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

function GeometricPattern({ color, size = 120 }: { color: string; size?: number }) {
  const c = size / 2;
  const r = size * 0.38;
  const r2 = size * 0.22;

  // 8-pointed star (khatam) points — alternating outer/inner radii
  const pts: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 8;
    const angle2 = angle + Math.PI / 8;
    pts.push([c + r * Math.cos(angle), c + r * Math.sin(angle)]);
    pts.push([c + r2 * Math.cos(angle2), c + r2 * Math.sin(angle2)]);
  }
  const starPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z';

  // Outer octagon
  const oct: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const x = (c + size * 0.44 * Math.cos(a)).toFixed(1);
    const y = (c + size * 0.44 * Math.sin(a)).toFixed(1);
    oct.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  const octPath = oct.join(' ') + ' Z';

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={size * 0.46} stroke={color} strokeWidth={0.8} fill="none" opacity={0.3} />
      <Path d={octPath} stroke={color} strokeWidth={0.8} fill="none" opacity={0.4} />
      <Path d={starPath} fill={`${color}18`} stroke={color} strokeWidth={1} opacity={0.7} />
      <Circle cx={c} cy={c} r={size * 0.06} fill={color} opacity={0.6} />
      {[0, 45, 90, 135].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = (c + size * 0.46 * Math.cos(rad)).toFixed(1);
        const y1 = (c + size * 0.46 * Math.sin(rad)).toFixed(1);
        const x2 = (c - size * 0.46 * Math.cos(rad)).toFixed(1);
        const y2 = (c - size * 0.46 * Math.sin(rad)).toFixed(1);
        return <Line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={0.5} opacity={0.2} />;
      })}
    </Svg>
  );
}

const TYPE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  payments: 'cash-multiple',
  cases: 'alert-circle-outline',
  loans: 'handshake-outline',
  messages: 'email-outline',
  members: 'account-group-outline',
  search: 'magnify',
  notifications: 'bell-outline',
};

export function BrandedEmptyState({
  type = 'generic',
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: BrandedEmptyStateProps) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.85);

  useEffect(() => {
    // Was a 4s breathing loop. An empty state is a resting state; it should
    // hold still and let the copy do the work.
    pulse.value = 1;
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.5 + pulse.value * 0.5,
  }));

  const icon = TYPE_ICONS[type];

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.patternWrap, pulseStyle]}>
        <GeometricPattern color={colors.primary} size={120} />
        <View style={[styles.iconOverlay, { backgroundColor: colors.bg2, borderColor: colors.border1 }]}>
          {icon ? (
            <MaterialCommunityIcons name={icon} size={26} color={colors.text3} />
          ) : (
            <Mark size={30} color={colors.brandGold} />
          )}
        </View>
      </Animated.View>

      <Text style={[styles.title, { color: colors.text1 }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.text3 }]}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="primary" size="md" style={styles.btn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 280,
  },
  patternWrap: {
    width: 120,
    height: 120,
    marginBottom: spacing.lg,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOverlay: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 20 },
  title: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  btn: { marginTop: spacing.lg },
});

import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/useTheme';

/**
 * Progress drawn as discrete blocks rather than one continuous bar.
 *
 * A filled bar tells you roughly how far along something is. Blocks tell you
 * how far along AND out of what, without a second label — you can count them.
 * For a monthly contribution or a fund target, where the denominator is the
 * point, that reads faster than a percentage.
 *
 * Blocks that are only partly reached are shown outlined rather than empty, so
 * the track still has a shape when progress is near zero — an empty rail looks
 * like something failed to load.
 */
export function SegmentedProgress({
  value,
  total,
  segments = 8,
  color,
  height = 10,
  style,
  accessibilityLabel,
}: {
  value: number;
  total: number;
  segments?: number;
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const fill = color ?? colors.brandGold;
  const ratio = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  const filled = Math.round(ratio * segments);

  return (
    <View
      style={[styles.row, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: total, now: value }}
    >
      {Array.from({ length: segments }, (_, i) => (
        <View
          key={i}
          style={[
            styles.block,
            {
              height,
              borderRadius: height / 2.5,
              backgroundColor: i < filled ? fill : 'transparent',
              borderColor: i < filled ? fill : colors.border1,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5 },
  block: { flex: 1, borderWidth: 1 },
});

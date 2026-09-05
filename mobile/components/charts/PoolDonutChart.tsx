import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';
import { formatCurrencyShort } from '@/lib/charts';
import { spacing } from '@/lib/theme';

const { Svg, Path, Text: SvgText } = require('react-native-svg');

interface PoolSlice { label: string; value: number; color: string; }
interface PoolDonutChartProps { sadaqah: number; zakat: number; qarz: number; size?: number; }

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number, thickness: number): string {
  const sweep = Math.min(endDeg - startDeg, 359.9);
  if (sweep <= 0) return '';
  const outerStart = polarToXY(cx, cy, r, startDeg);
  const outerEnd = polarToXY(cx, cy, r, startDeg + sweep);
  const innerStart = polarToXY(cx, cy, r - thickness, startDeg);
  const innerEnd = polarToXY(cx, cy, r - thickness, startDeg + sweep);
  const large = sweep > 180 ? 1 : 0;
  return [
    `M${outerStart.x.toFixed(2)},${outerStart.y.toFixed(2)}`,
    `A${r},${r} 0 ${large} 1 ${outerEnd.x.toFixed(2)},${outerEnd.y.toFixed(2)}`,
    `L${innerEnd.x.toFixed(2)},${innerEnd.y.toFixed(2)}`,
    `A${r - thickness},${r - thickness} 0 ${large} 0 ${innerStart.x.toFixed(2)},${innerStart.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/** Animated wrapper fades+scales each arc segment in */
function ArcSlice({ path, color, delay }: { path: string; color: string; delay: number }) {
  const prog = useSharedValue(0);
  useEffect(() => {
    prog.value = withDelay(delay, withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }));
  }, [path, delay, prog]); // shared value has stable identity
  const style = useAnimatedStyle(() => ({
    opacity: prog.value,
    transform: [{ scale: interpolate(prog.value, [0, 1], [0.92, 1]) }],
  }));
  if (!path) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, style]} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFillObject}>
        <Path d={path} fill={color} opacity={0.95} />
      </Svg>
    </Animated.View>
  );
}

export const PoolDonutChart = memo(function PoolDonutChart({ sadaqah, zakat, qarz, size = 160 }: PoolDonutChartProps) {
  const { colors } = useTheme();
  const total = sadaqah + zakat + qarz || 1;
  const cx = size / 2, cy = size / 2, r = size / 2 - 8, thickness = 24;

  const slices: PoolSlice[] = [
    { label: 'Sadaqah', value: sadaqah, color: colors.primary },
    { label: 'Zakat', value: zakat, color: colors.gold },
    { label: 'Qarz', value: qarz, color: colors.accent },
  ];

  let cursor = 0;
  const arcs = slices.map((s) => {
    const sweep = (s.value / total) * 360;
    const start = cursor;
    const end = cursor + Math.max(sweep, s.value > 0 ? 2 : 0);
    cursor = end;
    return { ...s, path: s.value > 0 ? buildArc(cx, cy, r, start, end, thickness) : '' };
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.chartRow}>
        {/* SVG canvas */}
        <View style={{ width: size, height: size, position: 'relative' }}>
          {/* Base track */}
          <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
            <Path d={buildArc(cx, cy, r, 0, 359.9, thickness)} fill={colors.glass2} />
          </Svg>
          {/* Animated arcs */}
          {arcs.map((arc, i) => (
            <ArcSlice key={arc.label} path={arc.path} color={arc.color} delay={i * 80} />
          ))}
          {/* Center text overlay */}
          <Svg width={size} height={size} style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <SvgText x={cx} y={cy - 6} textAnchor="middle" fill={colors.text1} fontSize={13} fontWeight="700">
              {formatCurrencyShort(total)}
            </SvgText>
            <SvgText x={cx} y={cy + 11} textAnchor="middle" fill={colors.text3} fontSize={9}>
              TOTAL
            </SvgText>
          </Svg>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {arcs.filter((a) => a.value > 0).map((arc) => (
            <View key={arc.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: arc.color }]} />
              <View style={styles.legendText}>
                <Text style={[styles.legendLabel, { color: colors.text2 }]} numberOfLines={1}>{arc.label}</Text>
                <Text style={[styles.legendSub, { color: colors.text3 }]}>
                  {Math.round((arc.value / total) * 100)}% · {formatCurrencyShort(arc.value)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { padding: spacing.sm },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendText: { flex: 1 },
  legendLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  legendSub: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 1 },
});

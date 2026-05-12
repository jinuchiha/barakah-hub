import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import { formatCurrencyShort } from '@/lib/charts';
import { spacing } from '@/lib/theme';

interface PoolSlice {
  label: string;
  value: number;
  color: string;
}

interface PoolDonutChartProps {
  sadaqah: number;
  zakat: number;
  qarz: number;
  size?: number;
}

function polarToXY(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  thickness: number,
): string {
  const outerStart = polarToXY(cx, cy, r, startDeg);
  const outerEnd = polarToXY(cx, cy, r, endDeg);
  const innerStart = polarToXY(cx, cy, r - thickness, startDeg);
  const innerEnd = polarToXY(cx, cy, r - thickness, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M${outerStart.x},${outerStart.y}`,
    `A${r},${r} 0 ${largeArc} 1 ${outerEnd.x},${outerEnd.y}`,
    `L${innerEnd.x},${innerEnd.y}`,
    `A${r - thickness},${r - thickness} 0 ${largeArc} 0 ${innerStart.x},${innerStart.y}`,
    'Z',
  ].join(' ');
}

export const PoolDonutChart = memo(function PoolDonutChart({
  sadaqah,
  zakat,
  qarz,
  size = 160,
}: PoolDonutChartProps) {
  const { colors } = useTheme();
  const total = sadaqah + zakat + qarz || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const thickness = 24;

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
    return { ...s, start, end };
  });

  const { Svg, Path, Text: SvgText } = require('react-native-svg');

  return (
    <View style={styles.wrapper}>
      <View style={styles.chartRow}>
        <Svg width={size} height={size}>
          {arcs.map((arc, i) =>
            arc.value > 0 ? (
              <Path
                key={i}
                d={buildArc(cx, cy, r, arc.start, arc.end, thickness)}
                fill={arc.color}
                opacity={0.9}
              />
            ) : null,
          )}
          <SvgText
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fill={colors.text1}
            fontSize={14}
            fontWeight="700"
          >
            {formatCurrencyShort(total)}
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            fill={colors.text4}
            fontSize={10}
          >
            Total
          </SvgText>
        </Svg>

        <View style={styles.legend}>
          {slices.map((s) => (
            <View key={s.label} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <View>
                <Text style={[styles.legendLabel, { color: colors.text2 }]}>{s.label}</Text>
                <Text style={[styles.legendValue, { color: colors.text4 }]}>
                  {formatCurrencyShort(s.value)} · {Math.round((s.value / total) * 100)}%
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
  wrapper: {},
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  legend: {
    flex: 1,
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  legendValue: {
    fontSize: 11,
    fontFamily: 'SpaceMono_400Regular',
    marginTop: 1,
  },
});

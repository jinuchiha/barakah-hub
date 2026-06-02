import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import { formatCurrencyShort } from '@/lib/charts';
import { spacing } from '@/lib/theme';

interface FundLineChartProps {
  data: { month: string; amount: number }[];
  height?: number;
}

function computePoints(
  data: { amount: number }[],
  width: number,
  height: number,
): { x: number; y: number }[] {
  if (!data.length) return [];
  const max = Math.max(...data.map((d) => d.amount), 1);
  const padV = 12;
  return data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * width,
    y: padV + (1 - d.amount / max) * (height - padV * 2),
  }));
}

function buildLinePath(pts: { x: number; y: number }[]): string {
  if (!pts.length) return '';
  const [first, ...rest] = pts;
  return `M${first.x},${first.y} ` + rest.map((p) => `L${p.x},${p.y}`).join(' ');
}

function buildAreaPath(
  pts: { x: number; y: number }[],
  height: number,
): string {
  if (!pts.length) return '';
  const line = buildLinePath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${line} L${last.x},${height} L${first.x},${height} Z`;
}

export const FundLineChart = memo(function FundLineChart({
  data,
  height = 120,
}: FundLineChartProps) {
  const { colors } = useTheme();
  const WIDTH = 300;

  if (!data.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={[styles.emptyText, { color: colors.text4 }]}>No data</Text>
      </View>
    );
  }

  const pts = computePoints(data, WIDTH, height);
  const linePath = buildLinePath(pts);
  const areaPath = buildAreaPath(pts, height);

  const { Svg, Path, Defs, LinearGradient, Stop } = require('react-native-svg');

  return (
    <View style={styles.container}>
      <Svg width="100%" height={height} viewBox={`0 0 ${WIDTH} ${height}`}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.25" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#areaGrad)" />
        <Path d={linePath} stroke={colors.primary} strokeWidth={2} fill="none" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <Path
            key={i}
            d={`M${p.x},${p.y} m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0`}
            fill={colors.primary}
          />
        ))}
      </Svg>
      <View style={styles.labels}>
        {data.map((d, i) => (
          i % Math.max(1, Math.floor(data.length / 4)) === 0 ? (
            <Text key={i} style={[styles.label, { color: colors.text4 }]}>{d.month}</Text>
          ) : null
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {},
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginTop: 4,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
});

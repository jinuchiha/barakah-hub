import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';
import { formatCurrencyShort } from '@/lib/charts';
import { spacing, radius } from '@/lib/theme';

interface BarData {
  month: string;
  amount: number;
}

interface PaymentBarChartProps {
  data: BarData[];
  height?: number;
}

interface AnimatedBarProps {
  value: number;
  maxValue: number;
  color: string;
  height: number;
  index: number;
}

function AnimatedBar({ value, maxValue, color, height, index }: AnimatedBarProps) {
  const barHeight = useSharedValue(0);
  const targetHeight = maxValue > 0 ? (value / maxValue) * height : 0;

  React.useEffect(() => {
    barHeight.value = withDelay(
      index * 80,
      withSpring(targetHeight, { damping: 12, stiffness: 120 }),
    );
  }, [barHeight, targetHeight, index]);

  const style = useAnimatedStyle(() => ({
    height: barHeight.value,
  }));

  return (
    <Animated.View
      style={[
        style,
        { backgroundColor: color, borderRadius: radius.xs, width: '80%' },
      ]}
    />
  );
}

export const PaymentBarChart = memo(function PaymentBarChart({
  data,
  height = 100,
}: PaymentBarChartProps) {
  const { colors } = useTheme();
  const maxValue = Math.max(...data.map((d) => d.amount), 1);

  if (!data.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={[styles.emptyText, { color: colors.text4 }]}>No payment data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.barsRow, { height }]}>
        {data.map((d, i) => (
          <View key={d.month} style={styles.barCol}>
            <View style={[styles.barTrack, { height }]}>
              <AnimatedBar
                value={d.amount}
                maxValue={maxValue}
                color={colors.primary}
                height={height - 4}
                index={i}
              />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.label, { color: colors.text4 }]}>
            {d.month.slice(0, 3)}
          </Text>
        ))}
      </View>
      <View style={[styles.maxLabel]}>
        <Text style={[styles.maxText, { color: colors.text4 }]}>
          Max: PKR {formatCurrencyShort(maxValue)}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {},
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingHorizontal: spacing.xs,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
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
    justifyContent: 'space-around',
    marginTop: 6,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  maxLabel: {
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  maxText: {
    fontSize: 10,
    fontFamily: 'SpaceMono_400Regular',
  },
});

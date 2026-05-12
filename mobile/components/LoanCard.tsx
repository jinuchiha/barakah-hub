import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import type { Loan } from '@/types';
import { Badge } from './ui/Badge';
import { GlassCard } from './ui/GlassCard';
import { formatPKR, formatDate } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

interface LoanCardProps {
  loan: Loan;
  onRecordPayment?: () => void;
}

const RING_SIZE = 64;
const STROKE = 6;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function RepaymentRing({ progress, color }: { progress: number; color: string }) {
  const strokeDashoffset = useSharedValue(CIRCUMFERENCE);

  useEffect(() => {
    strokeDashoffset.value = withTiming(
      CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress))),
      { duration: 1000, easing: Easing.out(Easing.cubic) },
    );
  }, [progress]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value,
  }));

  return (
    <Svg width={RING_SIZE} height={RING_SIZE}>
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={STROKE}
        fill="transparent"
      />
      <AnimatedCircle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        stroke={color}
        strokeWidth={STROKE}
        fill="transparent"
        strokeDasharray={CIRCUMFERENCE}
        animatedProps={animProps}
        strokeLinecap="round"
        rotation="-90"
        origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
      />
    </Svg>
  );
}

export function LoanCard({ loan }: LoanCardProps) {
  const { colors } = useTheme();
  const remaining = loan.amount - loan.paid;
  const progress = loan.amount > 0 ? loan.paid / loan.amount : 0;
  const ringColor = loan.active ? colors.accent : colors.primary;

  return (
    <GlassCard glowColor={colors.accentDim} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.ringWrapper}>
          <RepaymentRing progress={progress} color={ringColor} />
          <View style={styles.ringLabel}>
            <Text style={[styles.ringPercent, { color: ringColor }]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>
        <View style={styles.infoBlock}>
          <Text style={[styles.purpose, { color: colors.text1 }]} numberOfLines={2}>
            {loan.purpose}
          </Text>
          <Badge
            label={loan.active ? 'Active' : 'Settled'}
            variant={loan.active ? 'info' : 'success'}
            style={styles.badge}
          />
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border1 }]} />

      <View style={styles.statsRow}>
        <LoanStat label="Total" value={formatPKR(loan.amount)} color={colors.text2} />
        <LoanStat label="Paid" value={formatPKR(loan.paid)} color={colors.primary} />
        <LoanStat label="Remaining" value={formatPKR(remaining)} color={colors.danger} />
      </View>

      <View style={styles.datesRow}>
        <Text style={[styles.dateText, { color: colors.text4 }]}>
          Issued: {formatDate(loan.issuedOn)}
        </Text>
        {loan.expectedReturn ? (
          <Text style={[styles.dateText, { color: colors.text4 }]}>
            Due: {formatDate(loan.expectedReturn)}
          </Text>
        ) : null}
      </View>
    </GlassCard>
  );
}

function LoanStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.35)' }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  ringWrapper: {
    position: 'relative',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  ringLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  infoBlock: {
    flex: 1,
  },
  purpose: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  badge: {},
  divider: {
    height: 1,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});

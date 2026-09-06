import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import type { Loan } from '@/types';
import { Badge } from './ui/Badge';
import { GlassCard } from './ui/GlassCard';
import { formatPKR, formatDate } from '@/lib/format';
import { planStatus, monthsRemaining } from '@/lib/loan-math';
import { useTheme } from '@/lib/useTheme';
import { spacing } from '@/lib/theme';
import { useLoanRepayments } from '@/hooks/useLoans';

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
    return () => { cancelAnimation(strokeDashoffset); strokeDashoffset.value = CIRCUMFERENCE; };
  }, [progress, strokeDashoffset]);

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
  const [expanded, setExpanded] = useState(false);
  const remaining = loan.amount - loan.paid;
  const progress = loan.amount > 0 ? loan.paid / loan.amount : 0;
  const isOverdue = loan.active && !!loan.expectedReturn && new Date(loan.expectedReturn) < new Date();
  const plan = planStatus({ ...loan, installmentAmount: loan.installmentAmount ?? null }, new Date());
  const monthsLeft = monthsRemaining({ ...loan, installmentAmount: loan.installmentAmount ?? null });
  const behindSchedule = loan.active && plan.hasPlan && !plan.onTrack;
  const ringColor = isOverdue || behindSchedule ? colors.danger : loan.active ? colors.accent : colors.primary;

  const { data: repayments } = useLoanRepayments(expanded ? loan.id : '');

  return (
    <Pressable onPress={() => setExpanded((v) => !v)}>
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
          <View style={styles.badgeRow}>
            <Badge
              label={loan.active ? 'Active' : 'Settled'}
              variant={loan.active ? 'info' : 'success'}
              style={styles.badge}
            />
            {isOverdue ? <Badge label="Overdue" variant="danger" style={styles.badge} /> : null}
            {behindSchedule ? <Badge label={`Behind ${formatPKR(plan.shortfall)}`} variant="danger" style={styles.badge} /> : null}
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border1 }]} />

      <View style={styles.statsRow}>
        <LoanStat label="Total" value={formatPKR(loan.amount)} color={colors.text2} />
        <LoanStat label="Paid" value={formatPKR(loan.paid)} color={colors.primary} />
        <LoanStat label="Remaining" value={formatPKR(remaining)} color={colors.danger} />
      </View>

      {plan.hasPlan ? (
        <View style={styles.datesRow}>
          <Text style={[styles.dateText, { color: colors.text3 }]}>
            Plan: {formatPKR(loan.installmentAmount ?? 0)}/month
          </Text>
          {loan.active && monthsLeft !== null ? (
            <Text style={[styles.dateText, { color: colors.text3 }]}>
              ~{monthsLeft} month{monthsLeft === 1 ? '' : 's'} left
            </Text>
          ) : null}
        </View>
      ) : null}

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

      {expanded && repayments && repayments.length > 0 ? (
        <View style={[styles.historySection, { borderTopColor: colors.border1 }]}>
          <Text style={[styles.historyTitle, { color: colors.text4 }]}>Repayment History</Text>
          {repayments.map((r) => (
            <View key={r.id} style={styles.historyRow}>
              <Text style={[styles.historyDate, { color: colors.text3 }]}>{formatDate(r.paidOn)}</Text>
              <Text style={[styles.historyAmt, { color: colors.primary }]}>{formatPKR(r.amount)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {expanded && repayments && repayments.length === 0 ? (
        <Text style={[styles.noHistory, { color: colors.text4 }]}>No repayments recorded yet.</Text>
      ) : null}
    </GlassCard>
    </Pressable>
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
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
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
    fontFamily: 'Inter_700Bold', fontVariant: ['tabular-nums'] },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  historySection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: 6,
  },
  historyTitle: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyDate: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  historyAmt: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  noHistory: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: spacing.sm, textAlign: 'center' },
});

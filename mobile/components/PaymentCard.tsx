import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Payment } from '@/types';
import { Badge } from './ui/Badge';
import { formatPKR, formatDate } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

interface PaymentCardProps {
  payment: Payment;
}

const POOL_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  sadaqah: 'hand-heart',
  zakat: 'star-crescent',
  qarz: 'handshake',
};

function getStatusInfo(payment: Payment) {
  if (payment.pendingVerify) return { label: 'Pending', variant: 'warning', pulse: true } as const;
  if (payment.verifiedAt) return { label: 'Verified', variant: 'success', pulse: false } as const;
  return { label: 'Rejected', variant: 'danger', pulse: false } as const;
}

function getAccentColor(pool: string, primary: string, accent: string, gold: string) {
  if (pool === 'sadaqah') return primary;
  if (pool === 'zakat') return accent;
  return gold;
}

export function PaymentCard({ payment }: PaymentCardProps) {
  const { colors } = useTheme();
  const status = getStatusInfo(payment);
  const accentColor = getAccentColor(payment.pool, colors.primary, colors.accent, colors.gold);

  return (
    <View style={[styles.card, { backgroundColor: colors.bg2, borderColor: colors.border1 }]}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.inner}>
        <View style={styles.left}>
          <View style={[styles.iconBox, { backgroundColor: `${accentColor}18` }]}>
            <MaterialCommunityIcons
              name={POOL_ICONS[payment.pool] ?? 'cash'}
              size={20}
              color={accentColor}
            />
          </View>
          <View style={styles.info}>
            <Text style={[styles.month, { color: colors.text1 }]}>{payment.monthLabel}</Text>
            <Text style={[styles.pool, { color: colors.text3 }]}>
              {payment.pool.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: accentColor }]}>{formatPKR(payment.amount)}</Text>
          <Text style={[styles.date, { color: colors.text4 }]}>{formatDate(payment.paidOn)}</Text>
          <Badge label={status.label} variant={status.variant} pulse={status.pulse} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  month: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  pool: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 15,
    fontFamily: 'SpaceMono_400Regular',
    fontWeight: '700',
  },
  date: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});

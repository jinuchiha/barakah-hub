import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAllPayments, useVerifyPayment, useRejectPayment } from '@/hooks/usePayments';
import { formatPKR, formatDate } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import type { Payment } from '@/types';

function getPoolColor(pool: string, colors: ReturnType<typeof useTheme>['colors']) {
  if (pool === 'sadaqah') return colors.primary;
  if (pool === 'zakat') return colors.accent;
  return colors.gold;
}

function PendingPaymentCard({
  payment,
  onVerify,
  onReject,
}: {
  payment: Payment;
  onVerify: () => void;
  onReject: () => void;
}) {
  const { colors } = useTheme();
  const memberName = payment.member?.nameEn ?? 'Member';
  const poolColor = getPoolColor(payment.pool, colors);

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.poolStripe, { backgroundColor: poolColor }]} />
      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <Avatar name={memberName} color={payment.member?.color} size="sm" />
          <View style={styles.cardInfo}>
            <Text style={[styles.memberName, { color: colors.text1 }]}>{memberName}</Text>
            <Text style={[styles.month, { color: colors.text3 }]}>{payment.monthLabel}</Text>
          </View>
          <View style={styles.amountBlock}>
            <Text style={[styles.amount, { color: poolColor }]}>{formatPKR(payment.amount)}</Text>
            <Text style={[styles.poolLabel, { color: colors.text4 }]}>{payment.pool.toUpperCase()}</Text>
          </View>
        </View>

        {payment.note ? (
          <View style={[styles.noteRow, { backgroundColor: colors.glass1 }]}>
            <MaterialCommunityIcons name="note-text-outline" size={13} color={colors.text4} />
            <Text style={[styles.note, { color: colors.text3 }]}>{payment.note}</Text>
          </View>
        ) : null}

        <Text style={[styles.submitDate, { color: colors.text4 }]}>Submitted {formatDate(payment.createdAt)}</Text>

        <View style={styles.actionRow}>
          <Button label="Reject" onPress={onReject} variant="danger" size="sm" style={styles.actionBtn} />
          <Button label="Verify" onPress={onVerify} variant="solid" size="sm" style={styles.actionBtn} />
        </View>
      </View>
    </GlassCard>
  );
}

export default function PaymentsReviewScreen() {
  const { colors } = useTheme();
  const { data, isLoading, refetch, isRefetching } = useAllPayments();
  const verifyMutation = useVerifyPayment();
  const rejectMutation = useRejectPayment();

  const pending = data?.filter((p) => p.pendingVerify) ?? [];

  const handleVerify = (payment: Payment) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Verify Payment', `Verify ${formatPKR(payment.amount)} for ${payment.monthLabel}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify',
        onPress: async () => {
          try { await verifyMutation.mutateAsync(payment.id); }
          catch (err) { Alert.alert('Error', err instanceof Error ? err.message : 'Failed'); }
        },
      },
    ]);
  };

  const handleReject = (payment: Payment) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert('Reject Payment', 'Reject and delete this payment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try { await rejectMutation.mutateAsync(payment.id); }
          catch (err) { Alert.alert('Error', err instanceof Error ? err.message : 'Failed'); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      {isLoading ? (
        <EmptyState icon="loading" title="Loading payments..." />
      ) : (
        <FlashList
          data={pending}
          keyExtractor={(item: Payment) => item.id}
          estimatedItemSize={160}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListHeaderComponent={
            <Text style={[styles.count, { color: colors.text4 }]}>{pending.length} pending verification</Text>
          }
          ListEmptyComponent={
            <EmptyState icon="cash-check" title="All payments verified" subtitle="No payments pending review" />
          }
          renderItem={({ item }) => (
            <PendingPaymentCard payment={item} onVerify={() => handleVerify(item)} onReject={() => handleReject(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: spacing.md, paddingBottom: 80 },
  count: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, marginBottom: spacing.sm },
  card: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  poolStripe: { width: 4 },
  cardInner: { flex: 1, padding: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardInfo: { flex: 1 },
  memberName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  month: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  amountBlock: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontFamily: 'SpaceMono_400Regular', fontWeight: '700' },
  poolLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    padding: spacing.sm,
    borderRadius: radius.xs,
    marginBottom: spacing.sm,
  },
  note: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  submitDate: { fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
});

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, TouchableOpacity, Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { PaymentCard } from '@/components/PaymentCard';
import { PaymentSubmitModal } from '@/components/PaymentSubmitModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { useMyPayments, useSubmitDonation } from '@/hooks/usePayments';
import { formatPKR } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import type { Payment, FundPool } from '@/types';

const POOLS: Array<{ value: FundPool | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'sadaqah', label: 'Sadaqah' },
  { value: 'zakat', label: 'Zakat' },
  { value: 'qarz', label: 'Qarz' },
];

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primaryDim : colors.glass2,
          borderColor: active ? colors.primary : colors.border1,
        },
      ]}
      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
    >
      <Text style={[styles.chipText, { color: active ? colors.primary : colors.text3 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FABButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.shadowGreen }, animStyle]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.9, { damping: 12, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 400 }); }}
        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
        style={styles.fabInner}
      >
        <MaterialCommunityIcons name="plus" size={26} color="#0a0a0f" />
      </Pressable>
    </Animated.View>
  );
}

function PaymentsScreen() {
  const { colors } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [poolFilter, setPoolFilter] = useState<FundPool | 'all'>('all');
  const { data, isLoading, refetch, isRefetching } = useMyPayments();
  const submitMutation = useSubmitDonation();

  const filtered = useMemo(() => {
    if (!data) return [];
    if (poolFilter === 'all') return data;
    return data.filter((p) => p.pool === poolFilter);
  }, [data, poolFilter]);

  const totalVerified = useMemo(
    () => data?.filter((p) => !p.pendingVerify && p.verifiedAt).reduce((s, p) => s + p.amount, 0) ?? 0,
    [data],
  );

  const pendingCount = data?.filter((p) => p.pendingVerify).length ?? 0;

  const handleSubmit = async (formData: { amount: number; pool: FundPool; monthLabel: string; note?: string; receiptUrl?: string }) => {
    await submitMutation.mutateAsync(formData);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={[styles.title, { color: colors.text1 }]}>My Payments</Text>
        <Text style={[styles.total, { color: colors.primary }]}>{formatPKR(totalVerified)}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.statsRow}>
        <StatCard icon="cash-check" value={formatPKR(totalVerified)} label="Total Verified" style={styles.stat} />
        <StatCard icon="clock-outline" value={`${pendingCount}`} label="Pending" iconColor={colors.gold} style={styles.stat} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.filterRow}>
        {POOLS.map((p) => (
          <FilterChip key={p.value} label={p.label} active={poolFilter === p.value} onPress={() => setPoolFilter(p.value)} />
        ))}
      </Animated.View>

      {isLoading ? (
        <EmptyState icon="loading" title="Loading payments..." />
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item: Payment) => item.id}
          renderItem={({ item }) => <PaymentCard payment={item} />}
          estimatedItemSize={88}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="cash-remove"
              title="No payments yet"
              subtitle="Submit your first donation to get started"
              actionLabel="Submit Payment"
              onAction={() => setShowModal(true)}
            />
          }
        />
      )}

      <FABButton onPress={() => setShowModal(true)} />

      <PaymentSubmitModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
      />
    </SafeAreaView>
  );
}

export default PaymentsScreen;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  total: { fontSize: 14, fontFamily: 'SpaceMono_400Regular' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stat: { flex: 1 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  list: { padding: spacing.md, paddingTop: spacing.sm, paddingBottom: 100 },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

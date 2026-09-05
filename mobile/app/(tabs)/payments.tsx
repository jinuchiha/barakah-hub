import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Text, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { PaymentCard } from '@/components/PaymentCard';
import { SuccessOverlay } from '@/components/ui/SuccessOverlay';
import { PaymentSubmitModal } from '@/components/PaymentSubmitModal';
import { DuaOverlay } from '@/components/DuaOverlay';
import { EmptyState } from '@/components/ui/EmptyState';
import { BrandedEmptyState } from '@/components/ui/BrandedEmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { AnimatedNumber, fmtRsWorklet } from '@/components/ui/AnimatedNumber';
import { useMyPayments, useSubmitDonation } from '@/hooks/usePayments';
import { useConfig } from '@/hooks/useConfig';
import { useAuthStore } from '@/stores/auth.store';
import { unlockAchievement } from '@/lib/achievements';
import { formatPKR } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import type { Payment, FundPool } from '@/types';


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
  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.primary }]}
      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
      activeOpacity={0.8}
      accessibilityLabel="Submit payment"
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name="plus" size={26} color={colors.bg0} />
    </TouchableOpacity>
  );
}

function PaymentsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [showDua, setShowDua] = useState(false);
  const [achievementMsg, setAchievementMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [poolFilter, setPoolFilter] = useState<FundPool | 'all'>('all');
  const { data, isLoading, isError, refetch, isRefetching } = useMyPayments();
  const submitMutation = useSubmitDonation();
  const { data: config } = useConfig();
  const achievementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modalMounted, setModalMounted] = useState(false);

  useEffect(() => {
    // Pre-warm modal 300ms after screen mounts so first open is instant
    const t = setTimeout(() => setModalMounted(true), 300);
    return () => {
      clearTimeout(t);
      if (achievementTimer.current) clearTimeout(achievementTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const POOLS: { value: FundPool | 'all'; label: string }[] = [
    { value: 'all', label: t('payments.all') },
    { value: 'sadaqah', label: t('payments.sadaqah') },
    { value: 'zakat', label: t('payments.zakat') },
    { value: 'qarz', label: t('payments.qarz') },
  ];

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

  // No try/catch here — errors propagate to PaymentSubmitModal which shows Alert.
  const handleSubmit = async (formData: { amount: number; pool: FundPool; monthLabel: string; note?: string; receiptUrl?: string; idempotencyKey: string }) => {
    await submitMutation.mutateAsync(formData);
    setShowModal(false);
    // Same reward moment the web gives: a sourced dua instead of a toast.
    setShowDua(true);
    setSuccessToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSuccessToast(false), 2500);
    const unlocked = unlockAchievement('first_donation');
    if (unlocked) {
      achievementTimer.current = setTimeout(() => setAchievementMsg('First Donation! +50 pts'), 1600);
    }
    const pledge = user?.monthlyPledge ?? 0;
    if (pledge > 0 && formData.amount >= pledge * 2) {
      unlockAchievement('generous_heart');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <LinearGradient
          colors={[colors.primaryDim, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <Text style={[styles.heroLabel, { color: colors.text4 }]}>{t('dashboard.myPayments')}</Text>
          <AnimatedNumber value={totalVerified} format={fmtRsWorklet} style={[styles.heroValue, { color: colors.text1 }]} />
          <Text style={[styles.heroSub, { color: colors.text3 }]}>{t('payments.totalVerified')} · {pendingCount} {t('dashboard.pending').toLowerCase()}</Text>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.statsRow}>
        <StatCard icon="cash-check" value={formatPKR(totalVerified)} label={t('payments.totalVerified')} style={styles.stat} />
        <StatCard icon="clock-outline" value={`${pendingCount}`} label={t('dashboard.pending')} iconColor={colors.gold} style={styles.stat} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.filterRow}>
        {POOLS.map((p) => (
          <FilterChip key={p.value} label={p.label} active={poolFilter === p.value} onPress={() => setPoolFilter(p.value)} />
        ))}
      </Animated.View>

      {isError ? (
        <EmptyState icon="alert-circle-outline" title={t('common.error')} actionLabel={t('common.retry')} onAction={() => void refetch()} />
      ) : isLoading ? (
        <EmptyState icon="loading" title={t('common.loading')} />
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item: Payment) => item.id}
          renderItem={({ item }) => <PaymentCard payment={item} />}
          estimatedItemSize={88}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <BrandedEmptyState
              type="payments"
              title={t('payments.noPayments')}
              subtitle="Submit your first donation to get started"
              actionLabel={t('payments.submitPayment')}
              onAction={() => setShowModal(true)}
            />
          }
        />
      )}

      <FABButton onPress={() => setShowModal(true)} />

      {successToast ? (
        <Animated.View entering={FadeInDown.duration(250)} style={[styles.toast, { backgroundColor: colors.bg2, borderColor: colors.success }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
          <Text style={[styles.toastText, { color: colors.text1 }]}>Submitted! Pending admin review.</Text>
        </Animated.View>
      ) : null}

      <DuaOverlay visible={showDua} onDone={() => setShowDua(false)} />

      <SuccessOverlay
        visible={achievementMsg !== null}
        type="success"
        message={achievementMsg ?? ''}
        onDone={() => setAchievementMsg(null)}
        autoDismissMs={2200}
      />

      {modalMounted && (
        <PaymentSubmitModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          easyPaiseNumber={config?.easyPaiseNumber ?? undefined}
          easyPaiseName={config?.easyPaiseName ?? undefined}
        />
      )}
    </SafeAreaView>
  );
}

export default PaymentsScreen;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  heroGradient: {
    paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  heroLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.8 },
  heroValue: { fontSize: 30, fontFamily: 'Inter_700Bold', marginTop: 4 },
  heroSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
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
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  toast: {
    position: 'absolute',
    bottom: 160,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    zIndex: 200,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
});

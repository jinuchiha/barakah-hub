import React, { useState } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SwipeableRow } from '@/components/SwipeableRow';
import { LoanCard } from '@/components/LoanCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { BrandedEmptyState } from '@/components/ui/BrandedEmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useMyLoans, useAllLoans, useRecordRepayment } from '@/hooks/useLoans';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/lib/useTheme';
import { formatPKR } from '@/lib/format';
import { spacing, radius } from '@/lib/theme';
import type { Loan } from '@/types';

const repaySchema = z.object({
  loanId: z.string().uuid(),
  amount: z.coerce.number().int().positive('Amount required'),
  note: z.string().max(200).optional(),
});

type RepayFormData = z.infer<typeof repaySchema>;

function RepaySheet({ loan, onClose }: { loan: Loan | null; onClose: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const repayMutation = useRecordRepayment();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<RepayFormData>({
    resolver: zodResolver(repaySchema),
  });

  React.useEffect(() => {
    if (loan?.id) setValue('loanId', loan.id);
  }, [loan?.id, setValue]);

  if (!loan) return null;

  const handleRepay = async (data: RepayFormData) => {
    if (loading || repayMutation.isPending) return;
    setLoading(true);
    try {
      await repayMutation.mutateAsync(data);
      reset();
      onClose();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to record repayment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.sheetBackdrop}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetContainer}>
        <GlassCard style={styles.sheet}>
          <View style={[styles.handle, { backgroundColor: colors.border2 }]} />
          <Text style={[styles.sheetTitle, { color: colors.text1 }]}>{t('loans.recordRepayment')}</Text>
          <View style={[styles.loanSummary, { backgroundColor: colors.glass1 }]}>
            <Text style={[styles.loanPurpose, { color: colors.text2 }]}>{loan.purpose}</Text>
            <Text style={[styles.loanRemaining, { color: colors.danger }]}>
              {t('loans.remaining')}: {formatPKR(loan.amount - loan.paid)}
            </Text>
          </View>
          <Controller control={control} name="amount"
            render={({ field: { onChange, value } }) => (
              <Input label={t('loans.amount')} value={value?.toString() ?? ''} onChangeText={onChange} keyboardType="numeric" leftIcon="cash" error={errors.amount?.message} />
            )}
          />
          <Controller control={control} name="note"
            render={({ field: { onChange, value } }) => (
              <Input label={t('payments.note')} value={value ?? ''} onChangeText={onChange} multiline error={errors.note?.message} />
            )}
          />
          <View style={styles.sheetBtns}>
            <Button label={t('common.cancel')} onPress={onClose} variant="ghost" style={styles.halfBtn} />
            <Button label={t('common.confirm')} onPress={handleSubmit(handleRepay)} loading={loading} variant="solid" style={styles.halfBtn} />
          </View>
        </GlassCard>
      </KeyboardAvoidingView>
    </View>
  );
}

function LoansScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isAdmin = user?.role === 'admin';
  const [viewAll, setViewAll] = useState(false);
  const [repayLoan, setRepayLoan] = useState<Loan | null>(null);

  const myLoansQuery = useMyLoans();
  const allLoansQuery = useAllLoans(isAdmin); // only fire for admins
  const activeQuery = isAdmin && viewAll ? allLoansQuery : myLoansQuery;
  const loans = activeQuery.data ?? [];

  const totalOutstanding = loans.filter((l) => l.active).reduce((s, l) => s + (l.amount - l.paid), 0);
  const totalPaid = loans.reduce((s, l) => s + l.paid, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <LinearGradient
          colors={[colors.accentDim, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroRow}>
            <View>
              <Text style={[styles.heroLabel, { color: colors.text4 }]}>{t('islamic.qarzHasana').toUpperCase()}</Text>
              <Text style={[styles.heroValue, { color: colors.text1 }]}>{formatPKR(totalOutstanding)}</Text>
              <Text style={[styles.heroSub, { color: colors.text3 }]}>{t('loans.remaining').toLowerCase()} · {formatPKR(totalPaid)} {t('loans.paid').toLowerCase()}</Text>
            </View>
            {isAdmin ? (
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: viewAll ? colors.primaryDim : colors.glass2, borderColor: viewAll ? colors.primary : colors.border1 }]}
                onPress={() => setViewAll(!viewAll)}
              >
                <Text style={[styles.toggleText, { color: viewAll ? colors.primary : colors.text3 }]}>
                  {viewAll ? t('loans.myLoans') : t('loans.allLoans')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(60)} style={styles.statsRow}>
        <StatCard icon="handshake-outline" value={`${loans.filter((l) => l.active).length}`} label={t('loans.active')} style={styles.stat} />
        <StatCard icon="cash-check" value={formatPKR(totalPaid)} label={t('loans.paid')} style={styles.stat} />
        <StatCard icon="cash-remove" value={formatPKR(totalOutstanding)} label={t('loans.remaining')} iconColor={colors.danger} style={styles.stat} />
      </Animated.View>

      {activeQuery.isLoading ? (
        <EmptyState icon="loading" title={t('common.loading')} />
      ) : (
        <FlashList
          data={loans}
          keyExtractor={(item: Loan) => item.id}
          renderItem={({ item }) => (
            <SwipeableRow
              rightAction={isAdmin && item.active ? {
                icon: 'cash-plus',
                label: 'Repay',
                color: colors.accent,
                onPress: () => setRepayLoan(item),
              } : undefined}
            >
              <LoanCard loan={item} />
            </SwipeableRow>
          )}
          estimatedItemSize={180}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={activeQuery.isRefetching} onRefresh={activeQuery.refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<BrandedEmptyState type="loans" title={t('loans.noLoans')} subtitle={t('loans.noActiveLoans')} />}
        />
      )}

      {repayLoan ? <RepaySheet loan={repayLoan} onClose={() => setRepayLoan(null)} /> : null}
    </SafeAreaView>
  );
}

export default LoansScreen;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  heroGradient: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.md },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.8 },
  heroValue: { fontSize: 28, fontFamily: 'Inter_700Bold', marginTop: 4 },
  heroSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  toggleBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5,
  },
  toggleText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: spacing.md,
    gap: spacing.sm, marginBottom: spacing.sm,
  },
  stat: { flex: 1 },
  list: { padding: spacing.md, paddingTop: spacing.sm, paddingBottom: 100 },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end', zIndex: 100,
  },
  sheetContainer: { justifyContent: 'flex-end' },
  sheet: { padding: spacing.lg, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', marginBottom: spacing.md },
  loanSummary: { padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.md },
  loanPurpose: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  loanRemaining: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  sheetBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  halfBtn: { flex: 1 },
});

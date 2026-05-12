import React, { useState } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoanCard } from '@/components/LoanCard';
import { EmptyState } from '@/components/ui/EmptyState';
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
  const repayMutation = useRecordRepayment();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<RepayFormData>({
    resolver: zodResolver(repaySchema),
  });

  React.useEffect(() => {
    if (loan) setValue('loanId', loan.id);
  }, [loan, setValue]);

  if (!loan) return null;

  const handleRepay = async (data: RepayFormData) => {
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
          <Text style={[styles.sheetTitle, { color: colors.text1 }]}>Record Repayment</Text>
          <View style={[styles.loanSummary, { backgroundColor: colors.glass1 }]}>
            <Text style={[styles.loanPurpose, { color: colors.text2 }]}>{loan.purpose}</Text>
            <Text style={[styles.loanRemaining, { color: colors.danger }]}>
              Remaining: {formatPKR(loan.amount - loan.paid)}
            </Text>
          </View>
          <Controller control={control} name="amount"
            render={({ field: { onChange, value } }) => (
              <Input label="Amount (PKR)" value={value?.toString() ?? ''} onChangeText={onChange} keyboardType="numeric" leftIcon="cash" error={errors.amount?.message} />
            )}
          />
          <Controller control={control} name="note"
            render={({ field: { onChange, value } }) => (
              <Input label="Note (optional)" value={value ?? ''} onChangeText={onChange} multiline error={errors.note?.message} />
            )}
          />
          <View style={styles.sheetBtns}>
            <Button label="Cancel" onPress={onClose} variant="ghost" style={styles.halfBtn} />
            <Button label="Record" onPress={handleSubmit(handleRepay)} loading={loading} variant="solid" style={styles.halfBtn} />
          </View>
        </GlassCard>
      </KeyboardAvoidingView>
    </View>
  );
}

function LoansScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const isAdmin = user?.role === 'admin';
  const [viewAll, setViewAll] = useState(false);
  const [repayLoan, setRepayLoan] = useState<Loan | null>(null);

  const myLoansQuery = useMyLoans();
  const allLoansQuery = useAllLoans();
  const activeQuery = isAdmin && viewAll ? allLoansQuery : myLoansQuery;
  const loans = activeQuery.data ?? [];

  const totalOutstanding = loans.filter((l) => l.active).reduce((s, l) => s + (l.amount - l.paid), 0);
  const totalPaid = loans.reduce((s, l) => s + l.paid, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={[styles.title, { color: colors.text1 }]}>Qarz-e-Hasana</Text>
        {isAdmin ? (
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: viewAll ? colors.primaryDim : colors.glass2, borderColor: viewAll ? colors.primary : colors.border1 }]}
            onPress={() => setViewAll(!viewAll)}
          >
            <Text style={[styles.toggleText, { color: viewAll ? colors.primary : colors.text3 }]}>
              {viewAll ? 'My Loans' : 'All Loans'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.statsRow}>
        <StatCard icon="handshake-outline" value={`${loans.filter((l) => l.active).length}`} label="Active" style={styles.stat} />
        <StatCard icon="cash-check" value={formatPKR(totalPaid)} label="Total Repaid" style={styles.stat} />
        <StatCard icon="cash-remove" value={formatPKR(totalOutstanding)} label="Outstanding" iconColor={colors.danger} style={styles.stat} />
      </Animated.View>

      {activeQuery.isLoading ? (
        <EmptyState icon="loading" title="Loading loans..." />
      ) : (
        <FlashList
          data={loans}
          keyExtractor={(item: Loan) => item.id}
          renderItem={({ item }) => (
            <View>
              <LoanCard loan={item} />
              {isAdmin && item.active ? (
                <TouchableOpacity
                  style={[styles.repayBtn, { borderColor: colors.accent, backgroundColor: colors.accentDim }]}
                  onPress={() => setRepayLoan(item)}
                >
                  <MaterialCommunityIcons name="cash-plus" size={16} color={colors.accent} />
                  <Text style={[styles.repayBtnText, { color: colors.accent }]}>Record Repayment</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          estimatedItemSize={180}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={activeQuery.isRefetching} onRefresh={activeQuery.refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="handshake-outline" title="No loans" subtitle="No active loans at the moment" />}
        />
      )}

      {repayLoan ? <RepaySheet loan={repayLoan} onClose={() => setRepayLoan(null)} /> : null}
    </SafeAreaView>
  );
}

export default LoansScreen;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold' },
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
  repayBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, borderRadius: radius.full, borderWidth: 1.5,
    marginBottom: spacing.sm, marginHorizontal: spacing.md, gap: 6,
  },
  repayBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
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

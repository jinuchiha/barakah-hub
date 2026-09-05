import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity, Switch, Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CaseCard } from '@/components/CaseCard';
import { VoteModal } from '@/components/VoteModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { BrandedEmptyState } from '@/components/ui/BrandedEmptyState';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useCases, useCastVote, useCreateCase, useAdminResolveCase, useDeleteCase, useDisburseCase } from '@/hooks/useCases';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/auth.store';
import { unlockAchievement } from '@/lib/achievements';
import { useTheme } from '@/lib/useTheme';
import { formatPKR } from '@/lib/format';
import { spacing, radius } from '@/lib/theme';
import type { EmergencyCase, CaseStatus } from '@/types';

// One free-text "reason" field — user types in any language. Category
// is assigned server-side as "general" by default; admin can reclassify.
const caseSchema = z.object({
  beneficiaryName: z.string().min(2, 'Beneficiary name is required'),
  amount: z.coerce.number().int().positive('Amount must be a positive number'),
  reason: z.string().min(3, 'Please describe the need'),
  emergency: z.boolean().default(false),
  caseType: z.enum(['gift', 'qarz']),
  pool: z.enum(['sadaqah', 'zakat', 'qarz']),
  returnDate: z.string().refine(
    (val) => !val || /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/.test(val),
    { message: 'Format: MMM YYYY (e.g. Dec 2026)' },
  ).optional(),
});

type CaseFormData = z.infer<typeof caseSchema>;
type StatusFilter = CaseStatus | 'all';


function FilterTabs({ active, onChange, activeCaseCount }: {
  active: StatusFilter;
  onChange: (f: StatusFilter) => void;
  activeCaseCount: number;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'voting', label: t('cases.active') },
    { value: 'approved', label: t('cases.approved') },
    { value: 'rejected', label: t('cases.rejected') },
    { value: 'disbursed', label: t('cases.disbursed') },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f.value}
          style={[
            styles.filterTab,
            { backgroundColor: active === f.value ? colors.primaryDim : colors.glass2, borderColor: active === f.value ? colors.primary : colors.border1 },
          ]}
          onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(f.value); }}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === f.value }}
          accessibilityLabel={f.label}
        >
          <Text style={[styles.filterTabText, { color: active === f.value ? colors.primary : colors.text3 }]}>{f.label}</Text>
          {f.value === 'voting' && activeCaseCount > 0 ? (
            <View style={[styles.filterBadge, { backgroundColor: colors.gold }]}>
              <Text style={styles.filterBadgeText}>{activeCaseCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function CreateCaseSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const createMutation = useCreateCase();
  const [creating, setCreating] = useState(false);

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    mode: 'onTouched',
    defaultValues: { caseType: 'gift', pool: 'sadaqah', emergency: false, reason: '' },
  });

  const caseTypeValue = useWatch({ control, name: 'caseType' });
  const poolValue = useWatch({ control, name: 'pool' });

  const onSubmit = async (data: CaseFormData) => {
    setCreating(true);
    try {
      await createMutation.mutateAsync(data);
      reset();
      onClose();
      Alert.alert(t('cases.submitted'), t('cases.submittedMsg'));
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create case');
    } finally {
      setCreating(false);
    }
  };

  // Show validation errors via Alert so users on Android with the
  // keyboard up don't miss the inline red text.
  const onInvalid = (formErrors: Record<string, { message?: string }>) => {
    const first = Object.values(formErrors)[0];
    Alert.alert('Form incomplete', first?.message ?? 'Please fill all required fields');
  };

  return (
    <Modal visible={visible} transparent animationType={Platform.OS === 'android' ? 'none' : 'slide'} hardwareAccelerated onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetBackdrop}>
        <GlassCard style={styles.sheet}>
          <View style={[styles.handle, { backgroundColor: colors.border2 }]} />
          <Text style={[styles.sheetTitle, { color: colors.text1 }]}>{t('cases.createCase')}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Controller control={control} name="beneficiaryName"
              render={({ field: { onChange, value } }) => <Input label={t('cases.beneficiary')} value={value} onChangeText={onChange} error={errors.beneficiaryName?.message} />}
            />
            <Controller control={control} name="amount"
              render={({ field: { onChange, value } }) => <Input label={t('loans.amount')} value={value?.toString() ?? ''} onChangeText={onChange} keyboardType="numeric" error={errors.amount?.message} />}
            />
            <Controller control={control} name="reason"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Reason / وجہ"
                  value={value}
                  onChangeText={onChange}
                  multiline
                  numberOfLines={4}
                  placeholder="Describe the need (any language)"
                  error={errors.reason?.message}
                />
              )}
            />
            <Text style={[styles.fieldLabel, { color: colors.text4 }]}>{t('cases.caseTypeLabel')}</Text>
            <Controller control={control} name="caseType"
              render={({ field: { onChange, value } }) => (
                <View style={styles.chipRow}>
                  {(['gift', 'qarz'] as const).map((ct) => (
                    <TouchableOpacity
                      key={ct}
                      onPress={() => {
                        onChange(ct);
                        // qarz cases must draw from the qarz pool; gift cases must not.
                        if (ct === 'qarz') { setValue('pool', 'qarz'); }
                        else if (poolValue === 'qarz') { setValue('pool', 'sadaqah'); }
                      }}
                      style={[styles.chip, { backgroundColor: value === ct ? colors.primaryDim : colors.glass2, borderColor: value === ct ? colors.primary : colors.border1 }]}
                    >
                      <Text style={[styles.chipText, { color: value === ct ? colors.primary : colors.text3 }]}>
                        {ct === 'gift' ? t('cases.gift') : t('islamic.qarzHasana')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />

            <Text style={[styles.fieldLabel, { color: colors.text4 }]}>{t('cases.poolLabel')}</Text>
            <Controller control={control} name="pool"
              render={({ field: { onChange, value } }) => (
                <View style={styles.chipRow}>
                  {(['sadaqah', 'zakat', 'qarz'] as const).map((pl) => (
                    <TouchableOpacity
                      key={pl}
                      onPress={() => onChange(pl)}
                      disabled={caseTypeValue === 'qarz' && pl !== 'qarz'}
                      style={[styles.chip, {
                        backgroundColor: value === pl ? colors.primaryDim : colors.glass2,
                        borderColor: value === pl ? colors.primary : colors.border1,
                        opacity: caseTypeValue === 'qarz' && pl !== 'qarz' ? 0.35 : 1,
                      }]}
                    >
                      <Text style={[styles.chipText, { color: value === pl ? colors.primary : colors.text3 }]}>
                        {pl === 'sadaqah' ? t('payments.sadaqah') : pl === 'zakat' ? t('payments.zakat') : t('payments.qarz')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />

            <Controller control={control} name="emergency"
              render={({ field: { onChange, value } }) => (
                <View style={styles.emergencyRow}>
                  <Text style={[styles.emergencyLabel, { color: colors.text2 }]}>{t('cases.markEmergency')}</Text>
                  <Switch value={!!value} onValueChange={onChange} trackColor={{ false: colors.bg4, true: colors.dangerDim }} thumbColor={colors.danger} />
                </View>
              )}
            />

            <Controller control={control} name="returnDate" shouldUnregister={false}
              render={({ field: { onChange, value } }) => (
                <>{caseTypeValue === 'qarz' ? (
                  <Input label={t('cases.returnDateOptional')} value={value ?? ''} onChangeText={onChange} placeholder="Dec 2026" error={errors.returnDate?.message} />
                ) : null}</>
              )}
            />

            <View style={styles.sheetBtns}>
              <Button label={t('common.cancel')} onPress={onClose} variant="ghost" style={styles.halfBtn} />
              <Button
                label={creating ? t('cases.submitting') : t('common.submit')}
                onPress={handleSubmit(onSubmit, onInvalid)}
                loading={creating}
                disabled={creating}
                variant="solid"
                style={styles.halfBtn}
              />
            </View>
          </ScrollView>
        </GlassCard>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CasesScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('voting');
  const [voteTarget, setVoteTarget] = useState<EmergencyCase | null>(null);
  const [voteDir, setVoteDir] = useState<boolean | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createMounted, setCreateMounted] = useState(false);
  const mountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountTimer.current = setTimeout(() => setCreateMounted(true), 300);
    return () => { if (mountTimer.current) clearTimeout(mountTimer.current); };
  }, []);

  const { data, isLoading, isError, refetch, isRefetching } = useCases(
    statusFilter === 'all' ? {} : { status: statusFilter },
  );
  const voteMutation = useCastVote();
  const adminResolveMutation = useAdminResolveCase();
  const deleteMutation = useDeleteCase();
  const disburseMutation = useDisburseCase();
  const activeCaseCount = useMemo(() => data?.filter((c) => c.status === 'voting').length ?? 0, [data]);
  const isAdmin = user?.role === 'admin';

  const confirmAdminResolve = (caseId: string, decision: 'approved' | 'rejected', beneficiary: string) => {
    Alert.alert(
      decision === 'approved' ? 'Force Approve?' : 'Force Reject?',
      `Override the community vote for ${beneficiary}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: decision === 'approved' ? 'Approve' : 'Reject',
          style: decision === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await adminResolveMutation.mutateAsync({ caseId, decision });
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              Alert.alert('Failed', e instanceof Error ? e.message : 'Action failed');
            }
          },
        },
      ],
    );
  };

  const confirmDelete = (caseId: string, beneficiary: string) => {
    Alert.alert(
      'Delete case?',
      `Permanently remove the request for ${beneficiary}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(caseId);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (e) {
              Alert.alert('Failed', e instanceof Error ? e.message : 'Delete failed');
            }
          },
        },
      ],
    );
  };

  const confirmDisburse = (caseId: string, beneficiary: string, amount: number) => {
    Alert.alert(
      'Disburse Funds?',
      `Confirm ${formatPKR(amount)} disbursed to ${beneficiary}. For qarz cases this creates a loan to track repayment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disburse',
          onPress: async () => {
            try {
              await disburseMutation.mutateAsync(caseId);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              Alert.alert('Failed', e instanceof Error ? e.message : 'Disburse failed');
            }
          },
        },
      ],
    );
  };

  const handleVoteConfirm = async () => {
    if (!voteTarget || voteDir === null) return;
    // Hard double-tap guard on an irreversible action — the modal's disabled
    // button is the soft one; this stops a second in-flight mutateAsync.
    if (voteMutation.isPending) return;
    try {
      await voteMutation.mutateAsync({ caseId: voteTarget.id, yes: voteDir });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      unlockAchievement('voter');
      setVoteTarget(null);
    } catch (err) {
      Alert.alert('Vote Failed', err instanceof Error ? err.message : 'Failed to cast vote');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <LinearGradient
          colors={['rgba(30,45,74,0.55)', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }}
          style={styles.heroBand}
        >
          <View style={styles.header}>
            <View>
              <Text style={[styles.titleUr, { color: colors.gold }]}>ایمرجنسی کیسز</Text>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: colors.text1 }]}>{t('cases.title')}</Text>
                <View style={[styles.liveCountPill, { borderColor: colors.goldMuted }]}>
                  <AnimatedNumber value={activeCaseCount} style={[styles.liveCount, { color: colors.gold }]} />
                  <Text style={[styles.liveCountLabel, { color: colors.text4 }]}>{t('cases.active').toLowerCase()}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
              onPress={() => setShowCreate(true)}
            >
              <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
              <Text style={[styles.createBtnText, { color: colors.primary }]}>{t('cases.createCase')}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <FilterTabs active={statusFilter} onChange={setStatusFilter} activeCaseCount={activeCaseCount} />

      {isError ? (
        <EmptyState icon="alert-circle-outline" title={t('common.error')} />
      ) : isLoading ? (
        <EmptyState icon="loading" title={t('common.loading')} />
      ) : (
        <FlashList
          data={data ?? []}
          keyExtractor={(item: EmergencyCase) => item.id}
          renderItem={({ item }) => (
            <CaseCard
              emergencyCase={item}
              isOwn={item.applicantId === user?.id}
              isAdmin={isAdmin}
              onVoteYes={() => { setVoteTarget(item); setVoteDir(true); }}
              onVoteNo={() => { setVoteTarget(item); setVoteDir(false); }}
              onAdminApprove={isAdmin ? () => confirmAdminResolve(item.id, 'approved', item.beneficiaryName) : undefined}
              onAdminReject={isAdmin ? () => confirmAdminResolve(item.id, 'rejected', item.beneficiaryName) : undefined}
              onAdminDelete={isAdmin ? () => confirmDelete(item.id, item.beneficiaryName) : undefined}
              onAdminDisburse={isAdmin && item.status === 'approved' ? () => confirmDisburse(item.id, item.beneficiaryName, item.amount) : undefined}
            />
          )}
          estimatedItemSize={280}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<BrandedEmptyState type="cases" title={t('cases.noCasesFound')} subtitle={t('cases.noEmergencyCases')} />}
        />
      )}

      <VoteModal
        visible={voteTarget !== null}
        emergencyCase={voteTarget}
        voteDirection={voteDir}
        onConfirm={handleVoteConfirm}
        onCancel={() => { setVoteTarget(null); setVoteDir(null); }}
        loading={voteMutation.isPending}
      />

      {createMounted ? <CreateCaseSheet visible={showCreate} onClose={() => setShowCreate(false)} /> : null}
    </SafeAreaView>
  );
}

export default CasesScreen;

const styles = StyleSheet.create({
  heroBand: { borderRadius: 18, marginHorizontal: 12, marginTop: 6, paddingBottom: 4 },
  titleUr: { fontSize: 13, fontFamily: 'NotoNastaliqUrdu_600SemiBold', lineHeight: 28 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveCountPill: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 2,
  },
  liveCount: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  liveCountLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5,
  },
  createBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  filterScroll: { height: 48, marginBottom: spacing.sm, flexGrow: 0 },
  filterContent: { paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: 'center' },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5,
  },
  filterTabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  filterBadge: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#0a0a0f' },
  list: { padding: spacing.md, paddingTop: spacing.sm, paddingBottom: 100 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: { padding: spacing.lg, maxHeight: '90%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', marginBottom: spacing.lg },
  sheetBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  halfBtn: { flex: 1 },
  fieldLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, marginTop: spacing.sm, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  emergencyLabel: { fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1, marginRight: spacing.md },
});

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CaseCard } from '@/components/CaseCard';
import { VoteModal } from '@/components/VoteModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { useCases, useCastVote, useCreateCase } from '@/hooks/useCases';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import type { EmergencyCase, CaseStatus } from '@/types';

const caseSchema = z.object({
  beneficiaryName: z.string().min(2, 'Required'),
  category: z.string().min(1, 'Required'),
  amount: z.coerce.number().int().positive('Must be positive'),
  reasonEn: z.string().min(10, 'Minimum 10 characters'),
  reasonUr: z.string().min(3, 'Required'),
  emergency: z.boolean().default(false),
  caseType: z.enum(['gift', 'qarz']),
  pool: z.enum(['sadaqah', 'zakat', 'qarz']),
});

type CaseFormData = z.infer<typeof caseSchema>;
type StatusFilter = CaseStatus | 'all';

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'voting', label: 'Active' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'disbursed', label: 'Disbursed' },
];

function FilterTabs({ active, onChange, activeCaseCount }: {
  active: StatusFilter;
  onChange: (f: StatusFilter) => void;
  activeCaseCount: number;
}) {
  const { colors } = useTheme();

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
  const createMutation = useCreateCase();
  const [creating, setCreating] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: { caseType: 'gift', pool: 'sadaqah', emergency: false },
  });

  const onSubmit = async (data: CaseFormData) => {
    setCreating(true);
    try {
      await createMutation.mutateAsync(data);
      reset();
      onClose();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create case');
    } finally {
      setCreating(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.sheetBackdrop}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetContainer}>
        <GlassCard style={styles.sheet}>
          <View style={[styles.handle, { backgroundColor: colors.border2 }]} />
          <Text style={[styles.sheetTitle, { color: colors.text1 }]}>New Emergency Case</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Controller control={control} name="beneficiaryName"
              render={({ field: { onChange, value } }) => <Input label="Beneficiary Name" value={value} onChangeText={onChange} error={errors.beneficiaryName?.message} />}
            />
            <Controller control={control} name="category"
              render={({ field: { onChange, value } }) => <Input label="Category" value={value} onChangeText={onChange} error={errors.category?.message} />}
            />
            <Controller control={control} name="amount"
              render={({ field: { onChange, value } }) => <Input label="Amount (PKR)" value={value?.toString() ?? ''} onChangeText={onChange} keyboardType="numeric" error={errors.amount?.message} />}
            />
            <Controller control={control} name="reasonEn"
              render={({ field: { onChange, value } }) => <Input label="Reason (English)" value={value} onChangeText={onChange} multiline numberOfLines={3} error={errors.reasonEn?.message} />}
            />
            <Controller control={control} name="reasonUr"
              render={({ field: { onChange, value } }) => <Input label="وجہ (اردو)" value={value} onChangeText={onChange} multiline numberOfLines={2} error={errors.reasonUr?.message} />}
            />
            <View style={styles.sheetBtns}>
              <Button label="Cancel" onPress={onClose} variant="ghost" style={styles.halfBtn} />
              <Button label="Submit Case" onPress={handleSubmit(onSubmit)} loading={creating} variant="solid" style={styles.halfBtn} />
            </View>
          </ScrollView>
        </GlassCard>
      </KeyboardAvoidingView>
    </View>
  );
}

function CasesScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('voting');
  const [voteTarget, setVoteTarget] = useState<EmergencyCase | null>(null);
  const [voteDir, setVoteDir] = useState<boolean | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useCases(
    statusFilter === 'all' ? {} : { status: statusFilter },
  );
  const voteMutation = useCastVote();
  const activeCaseCount = useMemo(() => data?.filter((c) => c.status === 'voting').length ?? 0, [data]);

  const handleVoteConfirm = async () => {
    if (!voteTarget || voteDir === null) return;
    try {
      await voteMutation.mutateAsync({ caseId: voteTarget.id, yes: voteDir });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('Vote Failed', err instanceof Error ? err.message : 'Failed to cast vote');
    } finally {
      setVoteTarget(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={[styles.title, { color: colors.text1 }]}>Emergency Cases</Text>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
          onPress={() => setShowCreate(true)}
        >
          <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
          <Text style={[styles.createBtnText, { color: colors.primary }]}>New</Text>
        </TouchableOpacity>
      </Animated.View>

      <FilterTabs active={statusFilter} onChange={setStatusFilter} activeCaseCount={activeCaseCount} />

      {isLoading ? (
        <EmptyState icon="loading" title="Loading cases..." />
      ) : (
        <FlashList
          data={data ?? []}
          keyExtractor={(item: EmergencyCase) => item.id}
          renderItem={({ item }) => (
            <CaseCard
              emergencyCase={item}
              isOwn={item.applicantId === user?.id}
              onVoteYes={() => { setVoteTarget(item); setVoteDir(true); }}
              onVoteNo={() => { setVoteTarget(item); setVoteDir(false); }}
            />
          )}
          estimatedItemSize={200}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="alert-circle-outline" title="No cases found" subtitle="No emergency cases for this filter" />}
        />
      )}

      <VoteModal
        visible={voteTarget !== null}
        emergencyCase={voteTarget}
        voteDirection={voteDir}
        onConfirm={handleVoteConfirm}
        onCancel={() => setVoteTarget(null)}
        loading={voteMutation.isPending}
      />

      <CreateCaseSheet visible={showCreate} onClose={() => setShowCreate(false)} />
    </SafeAreaView>
  );
}

export default CasesScreen;

const styles = StyleSheet.create({
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
  filterScroll: { marginBottom: spacing.sm },
  filterContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheetContainer: { justifyContent: 'flex-end' },
  sheet: { padding: spacing.lg, maxHeight: '90%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', marginBottom: spacing.lg },
  sheetBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  halfBtn: { flex: 1 },
});

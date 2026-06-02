import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { haptic } from '@/lib/haptics';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useMembers, useApproveMember, useRejectMember } from '@/hooks/useMembers';
import { useAuthStore } from '@/stores/auth.store';
import { isAdminOnly } from '@/lib/roles';
import { Redirect } from 'expo-router';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { formatDate, formatPKR } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import type { Member } from '@/types';

function PendingMemberCard({
  member,
  onApprove,
  onReject,
}: {
  member: Member;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <GlassCard glowColor={colors.goldDim} style={styles.card}>
      <View style={styles.cardTop}>
        <Avatar name={member.nameEn || member.nameUr} color={member.color} size="md" />
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: colors.text1 }]}>{member.nameEn}</Text>
          {member.nameUr ? <Text style={[styles.memberNameUr, { color: colors.text3 }]}>{member.nameUr}</Text> : null}
          <Text style={[styles.memberMeta, { color: colors.text4 }]}>{t('admin.registered')} {formatDate(member.createdAt)}</Text>
        </View>
        <Badge label={t('members.pending')} variant="warning" pulse />
      </View>

      <View style={[styles.detailsRow, { backgroundColor: colors.glass1, borderRadius: radius.sm }]}>
        {member.phone ? (
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="phone-outline" size={13} color={colors.text3} />
            <Text style={[styles.detailText, { color: colors.text3 }]}>{member.phone}</Text>
          </View>
        ) : null}
        {member.city ? (
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.text3} />
            <Text style={[styles.detailText, { color: colors.text3 }]}>{member.city}</Text>
          </View>
        ) : null}
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="cash" size={13} color={colors.text3} />
          <Text style={[styles.detailText, { color: colors.text3 }]}>{formatPKR(member.monthlyPledge)}/mo</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button label={t('admin.reject')} onPress={onReject} variant="danger" size="md" style={styles.actionBtn} />
        <Button label={t('admin.approve')} onPress={onApprove} variant="solid" size="md" style={styles.actionBtn} />
      </View>
    </GlassCard>
  );
}

export default function ApproveMembersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, isLoading: authLoading } = useAuthStore();
  const { data: members, isLoading, refetch, isRefetching } = useMembers();
  const approveMutation = useApproveMember();
  const rejectMutation = useRejectMember();

  const pending = members?.filter((m) => m.status === 'pending') ?? [];

  const handleApprove = (member: Member) => {
    Alert.alert(t('admin.approveMember'), `Approve ${member.nameEn}?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.approve'),
        onPress: async () => {
          try {
            await approveMutation.mutateAsync(member.id);
            void haptic.confirm();
          } catch (err) {
            void haptic.error();
            Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Failed');
          }
        },
      },
    ]);
  };

  const handleReject = (member: Member) => {
    Alert.alert(t('admin.rejectMember'), `Reject ${member.nameEn}? This cannot be undone.`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.reject'),
        style: 'destructive',
        onPress: async () => {
          try {
            await rejectMutation.mutateAsync(member.id);
            void haptic.destructive();
          } catch (err) {
            void haptic.error();
            Alert.alert(t('common.error'), err instanceof Error ? err.message : 'Failed');
          }
        },
      },
    ]);
  };

  if (authLoading) return <LoadingScreen />;
  if (!isAdminOnly(user?.role)) return <Redirect href="/admin" />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      {isLoading ? (
        <EmptyState icon="loading" title={t('common.loading')} />
      ) : (
        <FlashList
          data={pending}
          keyExtractor={(item: Member) => item.id}
          estimatedItemSize={160}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListHeaderComponent={
            <Text style={[styles.count, { color: colors.text4 }]}>{t('admin.pendingApprovalCount', { count: pending.length })}</Text>
          }
          ListEmptyComponent={
            <EmptyState icon="account-check-outline" title={t('admin.noPendingMembers')} subtitle={t('admin.allReviewed')} />
          }
          renderItem={({ item }) => (
            <PendingMemberCard member={item} onApprove={() => handleApprove(item)} onReject={() => handleReject(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: spacing.md, paddingBottom: 80 },
  count: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  card: { padding: spacing.md, marginBottom: spacing.sm },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  memberNameUr: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  memberMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
});

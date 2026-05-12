import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useMembers, useApproveMember, useRejectMember } from '@/hooks/useMembers';
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
  const { colors } = useTheme();

  return (
    <GlassCard glowColor={colors.goldDim} style={styles.card}>
      <View style={styles.cardTop}>
        <Avatar name={member.nameEn || member.nameUr} color={member.color} size="md" />
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: colors.text1 }]}>{member.nameEn}</Text>
          {member.nameUr ? <Text style={[styles.memberNameUr, { color: colors.text3 }]}>{member.nameUr}</Text> : null}
          <Text style={[styles.memberMeta, { color: colors.text4 }]}>Registered {formatDate(member.createdAt)}</Text>
        </View>
        <Badge label="Pending" variant="warning" pulse />
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
        <Button label="Reject" onPress={onReject} variant="danger" size="md" style={styles.actionBtn} />
        <Button label="Approve" onPress={onApprove} variant="solid" size="md" style={styles.actionBtn} />
      </View>
    </GlassCard>
  );
}

export default function ApproveMembersScreen() {
  const { colors } = useTheme();
  const { data: members, isLoading, refetch, isRefetching } = useMembers();
  const approveMutation = useApproveMember();
  const rejectMutation = useRejectMember();

  const pending = members?.filter((m) => m.status === 'pending') ?? [];

  const handleApprove = (member: Member) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Approve Member', `Approve ${member.nameEn}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try { await approveMutation.mutateAsync(member.id); }
          catch (err) { Alert.alert('Error', err instanceof Error ? err.message : 'Failed'); }
        },
      },
    ]);
  };

  const handleReject = (member: Member) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert('Reject Member', `Reject ${member.nameEn}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try { await rejectMutation.mutateAsync(member.id); }
          catch (err) { Alert.alert('Error', err instanceof Error ? err.message : 'Failed'); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      {isLoading ? (
        <EmptyState icon="loading" title="Loading..." />
      ) : (
        <FlashList
          data={pending}
          keyExtractor={(item: Member) => item.id}
          estimatedItemSize={160}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListHeaderComponent={
            <Text style={[styles.count, { color: colors.text4 }]}>{pending.length} pending approval</Text>
          }
          ListEmptyComponent={
            <EmptyState icon="account-check-outline" title="No pending members" subtitle="All applications have been reviewed" />
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

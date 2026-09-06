import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, RefreshControl,
} from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useInvites, useCreateInvite, useRevokeInvite, inviteUrl, type MemberInvite,
} from '@/hooks/useInvites';
import { useAuthStore } from '@/stores/auth.store';
import { isAdminOnly } from '@/lib/roles';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { shareText } from '@/lib/share';
import { formatDate } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing } from '@/lib/theme';

function InviteCard({ invite, onRevoke }: { invite: MemberInvite; onRevoke: () => void }) {
  const { colors } = useTheme();
  const url = inviteUrl(invite.token);
  const expired = invite.expiresAt ? new Date(invite.expiresAt) < new Date() : false;
  const exhausted = invite.usedCount >= invite.maxUses;
  const dead = invite.revoked || expired || exhausted;

  const share = async () => {
    await shareText(`Join Barakah · our family fund:\n\n${url}`);
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={[styles.label, { color: colors.text1 }]}>{invite.label || 'Invite'}</Text>
        <Badge
          label={invite.revoked ? 'Revoked' : expired ? 'Expired' : exhausted ? 'Used up' : 'Active'}
          variant={dead ? 'danger' : 'success'}
        />
      </View>
      <Text style={[styles.token, { color: colors.text3 }]} numberOfLines={1}>{url}</Text>
      <Text style={[styles.meta, { color: colors.text4 }]}>
        {invite.usedCount}/{invite.maxUses} used
        {invite.expiresAt ? ` · expires ${formatDate(invite.expiresAt)}` : ''}
      </Text>
      {!dead ? (
        <View style={styles.actions}>
          <Button label="Share Link" onPress={share} variant="solid" size="sm" style={styles.actBtn} />
          <Button label="Revoke" onPress={onRevoke} variant="danger" size="sm" style={styles.actBtn} />
        </View>
      ) : null}
    </GlassCard>
  );
}

export default function InvitesScreen() {
  const { colors } = useTheme();
  const { user, isLoading: authLoading } = useAuthStore();
  const { data, isLoading, refetch, isRefetching } = useInvites();
  const create = useCreateInvite();
  const revoke = useRevokeInvite();
  const [creating, setCreating] = useState(false);

  if (authLoading) return <LoadingScreen />;
  if (!isAdminOnly(user?.role)) return <Redirect href="/admin" />;

  const handleCreate = async () => {
    setCreating(true);
    try {
      await create.mutateAsync({ maxUses: 1, expiresInDays: 14 });
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Could not create invite');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = (id: string) => {
    Alert.alert('Revoke invite?', 'This link will stop working.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try { await revoke.mutateAsync(id); }
          catch (err) { Alert.alert('Failed', err instanceof Error ? err.message : 'Failed'); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Member Invites' }} />
      <View style={styles.headerRow}>
        <Button
          label={creating ? 'Creating…' : '+ New Invite Link'}
          onPress={handleCreate}
          loading={creating}
          variant="solid"
          fullWidth
        />
      </View>
      {isLoading ? (
        <EmptyState icon="loading" title="Loading invites..." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {(data ?? []).length === 0 ? (
            <EmptyState icon="link-variant" title="No invites yet" subtitle="Create a link to invite a new member" />
          ) : (
            (data ?? []).map((inv) => (
              <InviteCard key={inv.id} invite={inv} onRevoke={() => handleRevoke(inv.id)} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerRow: { padding: spacing.md, paddingBottom: spacing.sm },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: 60 },
  card: { padding: spacing.md, marginBottom: spacing.sm },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  label: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  token: { fontSize: 12, fontFamily: 'SpaceMono_400Regular', marginBottom: 4 },
  meta: { fontSize: 11, fontFamily: 'Inter_400Regular', marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actBtn: { flex: 1 },
});

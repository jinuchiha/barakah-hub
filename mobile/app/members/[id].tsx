import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMember } from '@/hooks/useMembers';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/lib/useTheme';
import { formatDate, formatPKR } from '@/lib/format';
import { spacing, radius } from '@/lib/theme';

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border1 }]}>
      <View style={[styles.infoIconCircle, { backgroundColor: `${colors.primary}18` }]}>
        <MaterialCommunityIcons name={icon as never} size={14} color={colors.primary} />
      </View>
      <Text style={[styles.infoLabel, { color: colors.text3 }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text1 }]}>{value}</Text>
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: colors.text4 }]}>{title}</Text>
  );
}

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { data: member, isLoading, error, refetch, isRefetching } = useMember(id ?? '');

  if (isLoading) return <LoadingScreen />;
  if (error || !member) {
    return (
      <EmptyState
        icon="account-off"
        title="Member not found"
        subtitle="This member may not exist or you lack permission"
      />
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      <Stack.Screen options={{ title: member.nameEn || member.nameUr || 'Member' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <GlassCard style={styles.profileCard}>
            <Avatar name={member.nameEn || member.nameUr} size="xl" color={member.color} />
            <Text style={[styles.name, { color: colors.text1 }]}>{member.nameEn}</Text>
            {member.nameUr ? (
              <Text style={[styles.nameUr, { color: colors.text3 }]}>{member.nameUr}</Text>
            ) : null}
            <Text style={[styles.fatherName, { color: colors.text4 }]}>S/O {member.fatherName}</Text>
            <View style={styles.badgeRow}>
              <Badge
                label={member.role}
                variant={member.role === 'admin' ? 'info' : 'success'}
              />
              <Badge
                label={member.status}
                variant={
                  member.status === 'approved'
                    ? 'success'
                    : member.status === 'pending'
                      ? 'warning'
                      : 'danger'
                }
                pulse={member.status === 'pending'}
              />
              {member.deceased ? <Badge label="Deceased" variant="danger" /> : null}
            </View>
            <Text style={[styles.memberId, { color: colors.text4 }]}>
              #{member.id.slice(0, 8).toUpperCase()}
            </Text>
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <SectionLabel title="DETAILS" />
          <View style={styles.statsRow}>
            <StatCard
              icon="cash"
              value={formatPKR(member.monthlyPledge)}
              label="Monthly Pledge"
              style={styles.stat}
            />
            <StatCard
              icon="calendar"
              value={formatDate(member.joinedAt)}
              label="Joined"
              style={styles.stat}
            />
          </View>
        </Animated.View>

        {isAdmin ? (
          <Animated.View entering={FadeInDown.duration(400).delay(160)}>
            <SectionLabel title="CONTACT" />
            <GlassCard style={styles.infoCard}>
              {member.phone ? <InfoRow icon="phone" label="Phone" value={member.phone} /> : null}
              {member.city ? <InfoRow icon="map-marker" label="City" value={member.city} /> : null}
              {member.province ? <InfoRow icon="map" label="Province" value={member.province} /> : null}
              {member.username ? <InfoRow icon="at" label="Username" value={member.username} /> : null}
            </GlassCard>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(400).delay(isAdmin ? 240 : 160)}>
          <SectionLabel title="FAMILY" />
          <GlassCard style={styles.infoCard}>
            {member.clan ? <InfoRow icon="account-group" label="Clan" value={member.clan} /> : null}
            {member.relation ? <InfoRow icon="heart" label="Relation" value={member.relation} /> : null}
            {member.parentId ? (
              <InfoRow icon="account-supervisor" label="Parent" value="View parent" />
            ) : (
              <Text style={[styles.emptyInfo, { color: colors.text4 }]}>No family links recorded</Text>
            )}
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 80 },
  profileCard: {
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginTop: spacing.md,
  },
  nameUr: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  fatherName: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  memberId: {
    fontSize: 11,
    fontFamily: 'SpaceMono_400Regular',
    letterSpacing: 1.5,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stat: { flex: 1 },
  infoCard: {
    overflow: 'hidden',
    marginBottom: spacing.sm,
    padding: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  infoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyInfo: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    padding: spacing.md,
    fontStyle: 'italic',
  },
});

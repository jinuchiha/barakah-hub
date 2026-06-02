import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuthStore } from '@/stores/auth.store';
import { isAdminOnly } from '@/lib/roles';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

interface AdminStats {
  pendingMembers: number;
  pendingPayments: number;
  activeLoans: number;
  votingCases: number;
}

async function fetchAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>('/api/admin/stats');
  return data;
}

interface AdminActionProps {
  icon: string;
  label: string;
  badge?: number;
  color: string;
  onPress: () => void;
}

function AdminActionCard({ icon, label, badge, color, onPress }: AdminActionProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View style={[animStyle, styles.actionCardOuter]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.95, { damping: 12, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 400 }); }}
        onPress={handlePress}
      >
        <GlassCard elevated style={styles.actionCard}>
          <View style={[styles.actionIconCircle, { backgroundColor: `${color}20` }]}>
            <MaterialCommunityIcons name={icon as never} size={28} color={color} />
            {badge && badge > 0 ? (
              <View style={[styles.actionBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.actionBadgeText}>{badge > 99 ? '99+' : badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.actionLabel, { color: colors.text1 }]}>{label}</Text>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const isAdmin = isAdminOnly(user?.role);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats,
    staleTime: 30_000,
  });

  const hasPending = (data?.pendingMembers ?? 0) + (data?.pendingPayments ?? 0) > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.pageHeader}>
          <View style={[styles.shieldCircle, { backgroundColor: colors.dangerDim }]}>
            <MaterialCommunityIcons name="shield-crown-outline" size={28} color={colors.danger} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text1 }]}>{isAdmin ? t('admin.title') : 'Supervisor Panel'}</Text>
            <Text style={[styles.pageSub, { color: colors.text3 }]}>
              {isAdmin ? 'Manage Barakah Hub' : 'Approve fund collections'}
            </Text>
          </View>
        </Animated.View>

        {hasPending ? (
          <Animated.View entering={FadeInDown.duration(400).delay(80)}>
            <GlassCard glowColor={colors.goldDim} style={styles.pendingBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.gold} />
              <View style={styles.pendingText}>
                {(data?.pendingMembers ?? 0) > 0 ? (
                  <Text style={[styles.pendingItem, { color: colors.gold }]}>
                    {data?.pendingMembers} member{data?.pendingMembers !== 1 ? 's' : ''} pending approval
                  </Text>
                ) : null}
                {(data?.pendingPayments ?? 0) > 0 ? (
                  <Text style={[styles.pendingItem, { color: colors.gold }]}>
                    {data?.pendingPayments} payment{data?.pendingPayments !== 1 ? 's' : ''} to review
                  </Text>
                ) : null}
              </View>
            </GlassCard>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.statsGrid}>
          <StatCard icon="account-clock-outline" value={isLoading ? '...' : `${data?.pendingMembers ?? 0}`} label={t('admin.pendingApprovals')} iconColor={colors.gold} style={styles.stat} />
          <StatCard icon="cash-lock" value={isLoading ? '...' : `${data?.pendingPayments ?? 0}`} label={t('admin.pendingPayments')} iconColor={colors.danger} style={styles.stat} />
          <StatCard icon="handshake-outline" value={isLoading ? '...' : `${data?.activeLoans ?? 0}`} label="Active Loans" iconColor={colors.accent} style={styles.stat} />
          <StatCard icon="vote-outline" value={isLoading ? '...' : `${data?.votingCases ?? 0}`} label="Voting Cases" iconColor={colors.primary} style={styles.stat} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(160)}>
          <Text style={[styles.sectionLabel, { color: colors.text4 }]}>ACTIONS</Text>
          <View style={styles.actionsGrid}>
            {isAdmin ? (
              <AdminActionCard icon="account-check-outline" label={t('admin.approveMembers')} badge={data?.pendingMembers} color={colors.primary} onPress={() => router.push('/admin/approve-members')} />
            ) : null}
            <AdminActionCard icon="cash-check" label={t('admin.reviewPayments')} badge={data?.pendingPayments} color={colors.gold} onPress={() => router.push('/admin/payments-review')} />
            {isAdmin ? (
              <AdminActionCard icon="bullhorn-outline" label={t('admin.broadcast')} color="#ea80fc" onPress={() => router.push('/admin/broadcast')} />
            ) : null}
            {isAdmin ? (
              <AdminActionCard icon="account-group-outline" label="Members" color={colors.accent} onPress={() => router.push('/members/')} />
            ) : null}
            {isAdmin ? (
              <AdminActionCard icon="hand-coin-outline" label="Issue Loan" color={colors.primary} onPress={() => router.push('/admin/issue-loan')} />
            ) : null}
            {isAdmin ? (
              <AdminActionCard icon="link-variant" label="Invites" color="#ea80fc" onPress={() => router.push('/admin/invites')} />
            ) : null}
            {isAdmin ? (
              <AdminActionCard icon="account-plus-outline" label="Add Member" color={colors.primary} onPress={() => router.push('/admin/member-form')} />
            ) : null}
            {isAdmin ? (
              <AdminActionCard icon="message-text-outline" label="Messages" color={colors.accent} onPress={() => router.push('/messages')} />
            ) : null}
            {isAdmin ? (
              <AdminActionCard icon="chart-box-outline" label="Reports" color={colors.gold} onPress={() => router.push('/admin/reports')} />
            ) : null}
            {isAdmin ? (
              <AdminActionCard icon="cog-outline" label="Config" color={colors.primary} onPress={() => router.push('/admin/config')} />
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 80 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  shieldCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  pageSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pendingText: { flex: 1 },
  pendingItem: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  stat: { flexBasis: '47%', flexGrow: 1 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCardOuter: { flexBasis: '47%', flexGrow: 1 },
  actionCard: {
    padding: spacing.md,
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  actionBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Inter_700Bold' },
  actionLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
});

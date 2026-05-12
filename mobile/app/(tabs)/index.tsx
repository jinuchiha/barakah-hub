import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/stores/auth.store';
import { useAppStore } from '@/stores/app.store';
import { useDashboard } from '@/hooks/useDashboard';
import { FundCard } from '@/components/FundCard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/lib/useTheme';
import { spacing } from '@/lib/theme';
import { format } from 'date-fns';

function DashboardHeader({ displayName, notificationCount, onBell }: {
  displayName: string;
  notificationCount: number;
  onBell: () => void;
}) {
  const { colors } = useTheme();
  const today = format(new Date(), 'EEEE, d MMM yyyy');

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={[styles.greeting, { color: colors.gold }]}>السلام عليكم،</Text>
        <Text style={[styles.name, { color: colors.text1 }]}>{displayName}</Text>
        <Text style={[styles.dateLabel, { color: colors.text4 }]}>{today}</Text>
      </View>
      <TouchableOpacity style={[styles.bellBtn, { backgroundColor: colors.glass2, borderColor: colors.border1 }]} onPress={onBell}>
        <MaterialCommunityIcons name="bell-outline" size={22} color={colors.text2} />
        {notificationCount > 0 ? (
          <View style={[styles.bellBadge, { backgroundColor: colors.danger }]}>
            <Text style={styles.bellBadgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

function PaymentStatusBanner({ isPaid, amount, pledge, onPay }: {
  isPaid: boolean;
  amount?: number;
  pledge?: number;
  onPay: () => void;
}) {
  const { colors } = useTheme();

  if (isPaid) {
    return (
      <GlassCard glowColor={colors.primaryGlow} style={styles.statusBanner}>
        <MaterialCommunityIcons name="check-circle" size={28} color={colors.primary} />
        <View style={styles.statusText}>
          <Text style={[styles.statusTitle, { color: colors.primary }]}>This Month: Paid</Text>
          {amount ? <Text style={[styles.statusSub, { color: colors.text3 }]}>PKR {amount.toLocaleString()}</Text> : null}
        </View>
        <Badge label="Verified" variant="success" />
      </GlassCard>
    );
  }

  return (
    <GlassCard glowColor={colors.goldDim} style={styles.statusBanner}>
      <View style={[styles.warningDot, { backgroundColor: colors.goldDim }]}>
        <MaterialCommunityIcons name="alert" size={20} color={colors.gold} />
      </View>
      <View style={styles.statusText}>
        <Text style={[styles.statusTitle, { color: colors.gold }]}>Payment Due</Text>
        {pledge ? <Text style={[styles.statusSub, { color: colors.text3 }]}>PKR {pledge.toLocaleString()}/mo</Text> : null}
      </View>
      <Button label="Pay Now" onPress={onPay} variant="gold" size="sm" />
    </GlassCard>
  );
}

function QuickActions({ isAdmin, onAction }: {
  isAdmin: boolean;
  onAction: (action: string) => void;
}) {
  const { colors } = useTheme();
  const actions = [
    { key: 'pay', icon: 'cash-plus' as const, label: 'Pay', color: colors.primary },
    { key: 'emergency', icon: 'alert-circle-outline' as const, label: 'Emergency', color: colors.gold },
    { key: 'loans', icon: 'handshake-outline' as const, label: 'Loans', color: colors.accent },
    ...(isAdmin ? [{ key: 'admin', icon: 'shield-crown-outline' as const, label: 'Admin', color: colors.danger }] : [
      { key: 'members', icon: 'account-group-outline' as const, label: 'Members', color: '#ea80fc' },
    ]),
  ];

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.actionsRow}>
      {actions.map((a) => (
        <TouchableOpacity key={a.key} style={styles.actionChip} onPress={() => onAction(a.key)}>
          <View style={[styles.actionIconCircle, { backgroundColor: `${a.color}20` }]}>
            <MaterialCommunityIcons name={a.icon} size={22} color={a.color} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.text2 }]}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}

function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notificationCount } = useAppStore();
  const { colors } = useTheme();
  const { data, isLoading, error, refetch, isRefetching } = useDashboard();

  if (!isLoading && error) {
    return <EmptyState icon="wifi-off" title="Could not load dashboard" subtitle={error.message} actionLabel="Retry" onAction={() => refetch()} />;
  }

  const displayName = user?.nameEn ?? user?.nameUr ?? 'Member';

  const handleAction = (key: string) => {
    if (key === 'pay') router.push('/(tabs)/payments');
    else if (key === 'emergency') router.push('/(tabs)/cases');
    else if (key === 'loans') router.push('/(tabs)/loans');
    else if (key === 'admin') router.push('/admin/');
    else router.push('/members/');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader
          displayName={displayName}
          notificationCount={notificationCount}
          onBell={() => router.push('/notifications')}
        />

        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Text style={[styles.sectionLabel, { color: colors.text4 }]}>FUND OVERVIEW</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
            <FundCard pool="sadaqah" amount={data?.fund.sadaqah ?? 0} label="Sadaqah Fund" />
            <FundCard pool="zakat" amount={data?.fund.zakat ?? 0} label="Zakat Fund" />
            <FundCard pool="qarz" amount={data?.fund.qarz ?? 0} label="Qarz Fund" />
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={styles.statsRow}>
          <StatCard icon="wallet-outline" value={`PKR ${((user?.monthlyPledge ?? 0) / 1000).toFixed(0)}K`} label="My Pledge" style={styles.stat} />
          <StatCard icon="account-group-outline" value={`${data?.memberCount ?? 0}`} label="Members" iconColor={colors.gold} style={styles.stat} />
          <StatCard icon="cash-multiple" value={data?.myCurrentMonth ? 'Paid' : 'Pending'} label="This Month" iconColor={data?.myCurrentMonth ? colors.primary : colors.gold} style={styles.stat} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <PaymentStatusBanner
            isPaid={!!data?.myCurrentMonth}
            amount={data?.myCurrentMonth ? user?.monthlyPledge : undefined}
            pledge={user?.monthlyPledge}
            onPay={() => router.push('/(tabs)/payments')}
          />
        </Animated.View>

        <QuickActions isAdmin={user?.role === 'admin'} onAction={handleAction} />

        <Animated.View entering={FadeInDown.duration(400).delay(350)}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.text4 }]}>RECENT ACTIVITY</Text>
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <GlassCard style={styles.activityCard}>
            <ActivityFeed items={data?.recentActivity ?? []} />
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default DashboardScreen;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  name: { fontSize: 22, fontFamily: 'Inter_700Bold', marginTop: 2 },
  dateLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  bellBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, position: 'relative',
  },
  bellBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  sectionLabel: {
    fontSize: 11, fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2, marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  seeAll: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  cardsScroll: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stat: { flex: 1 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  statusSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  warningDot: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  actionChip: { alignItems: 'center', gap: 6 },
  actionIconCircle: {
    width: 54, height: 54, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  activityCard: { padding: spacing.md },
});

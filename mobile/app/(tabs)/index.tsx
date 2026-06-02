import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeInRight, useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { useAppStore } from '@/stores/app.store';
import { useDashboard } from '@/hooks/useDashboard';
import { useCommunity } from '@/hooks/useCommunity';
import { ActivityFeed } from '@/components/ActivityFeed';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { DailyVerseCard } from '@/components/DailyVerseCard';
import { GlobalSearch } from '@/components/GlobalSearch';
import { useTheme } from '@/lib/useTheme';
import { spacing } from '@/lib/theme';
import { formatPKR } from '@/lib/format';
import { format } from 'date-fns';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';

// ── Sub-components ────────────────────────────────────────────────────────────

function TopBar({ displayName, notifCount, onBell, onSearch }: {
  displayName: string; notifCount: number; onBell: () => void; onSearch: () => void;
}) {
  const { colors } = useTheme();
  const today = format(new Date(), 'EEE, d MMM');
  return (
    <View style={styles.topBar}>
      <View>
        <Text style={[styles.topGreeting, { color: colors.primary }]}>السلام عليكم</Text>
        <Text style={[styles.topName, { color: colors.text1 }]} numberOfLines={1}>{displayName}</Text>
        <Text style={[styles.topDate, { color: colors.text4 }]}>{today}</Text>
      </View>
      <View style={styles.topActions}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}
          onPress={onSearch}
          accessibilityLabel="Search"
        >
          <MaterialCommunityIcons name="magnify" size={19} color={colors.text2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}
          onPress={onBell}
          accessibilityLabel="Notifications"
        >
          <MaterialCommunityIcons name="bell-outline" size={20} color={colors.text2} />
          {notifCount > 0 && (
            <View style={[styles.notifDot, { backgroundColor: colors.danger }]}>
              <Text style={styles.notifText}>{notifCount > 9 ? '9+' : notifCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FundHero({ fund, pendingCount }: {
  fund?: { sadaqah: number; zakat: number; qarz: number };
  pendingCount?: number;
}) {
  const { t } = useTranslation();
  const sadaqah = fund?.sadaqah ?? 0;
  const zakat = fund?.zakat ?? 0;
  const qarz = fund?.qarz ?? 0;
  const total = sadaqah + zakat + qarz;

  const pools = [
    { key: 'sadaqah', value: sadaqah, color: '#c89b3c', label: t('dashboard.sadaqahPool') },
    { key: 'zakat', value: zakat, color: '#2d8a5f', label: t('dashboard.zakatPool') },
    { key: 'qarz', value: qarz, color: '#8b6ec9', label: t('dashboard.qarzPool') },
  ].filter((p) => p.value > 0);

  return (
    <Animated.View entering={FadeInDown.duration(450)}>
      <LinearGradient
        colors={['#c89b3c', '#d9b04c', '#1e2d4a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.heroCard}
      >
        {/* Decorative motif */}
        <Text style={styles.heroMotif} accessibilityElementsHidden>☽</Text>

        <Text style={styles.heroLabel}>{t('dashboard.totalFamilyFund')}</Text>
        <Text style={styles.heroAmount}>{formatPKR(total)}</Text>

        {/* Pool breakdown bar */}
        {total > 0 && (
          <View style={styles.poolBar}>
            {pools.map((p) => (
              <View
                key={p.key}
                style={[styles.poolSegment, { backgroundColor: p.color, flex: p.value / total }]}
              />
            ))}
          </View>
        )}

        {/* Pool legend */}
        {pools.length > 1 && (
          <View style={styles.poolLegend}>
            {pools.map((p) => (
              <View key={p.key} style={styles.poolLegendItem}>
                <View style={[styles.poolDot, { backgroundColor: p.color }]} />
                <Text style={styles.poolLegendLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.heroDivider} />
        {(pendingCount ?? 0) > 0 && (
          <View style={styles.heroFooter}>
            <Text style={styles.heroFooterText}>{pendingCount} {t('dashboard.pending').toLowerCase()}</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

function PaymentBanner({ isPaid, pledge, amount, onPay }: {
  isPaid: boolean; pledge?: number; amount?: number; onPay: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (isPaid) {
    return (
      <Animated.View entering={FadeInDown.duration(400).delay(80)}>
        <GlassCard style={styles.banner}>
          <View style={[styles.bannerIcon, { backgroundColor: 'rgba(45,138,95,0.15)' }]}>
            <MaterialCommunityIcons name="check-circle" size={22} color="#4ec38d" />
          </View>
          <View style={styles.bannerText}>
            <Text style={[styles.bannerTitle, { color: '#4ec38d' }]}>{t('dashboard.thisMontPaid')}</Text>
            {amount ? <Text style={[styles.bannerSub, { color: colors.text3 }]}>{formatPKR(amount)}</Text> : null}
          </View>
          <Badge label="Verified" variant="success" />
        </GlassCard>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(80)}>
      <GlassCard glowColor={colors.goldDim} style={styles.banner}>
        <View style={[styles.bannerIcon, { backgroundColor: 'rgba(200,155,60,0.12)' }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.gold} />
        </View>
        <View style={styles.bannerText}>
          <Text style={[styles.bannerTitle, { color: colors.gold }]}>{t('dashboard.paymentDue')}</Text>
          {pledge ? <Text style={[styles.bannerSub, { color: colors.text3 }]}>{formatPKR(pledge)}/mo</Text> : null}
        </View>
        <Button label={t('dashboard.payNow')} onPress={onPay} variant="gold" size="sm" />
      </GlassCard>
    </Animated.View>
  );
}

function StatsGrid({ pledge, pendingCount, isPaid }: {
  pledge?: number; pendingCount?: number; isPaid?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.statsGrid}>
      <StatCard
        icon="hand-coin-outline"
        value={formatPKR(pledge ?? 0)}
        label="My Pledge"
        style={styles.statHalf}
      />
      <StatCard
        icon={isPaid ? 'check-circle-outline' : 'clock-alert-outline'}
        value={isPaid ? t('dashboard.paid') : t('dashboard.pending')}
        label={t('dashboard.thisMonth')}
        iconColor={isPaid ? colors.accent : colors.gold}
        style={styles.statHalf}
      />
      <StatCard
        icon="clock-outline"
        value={`${pendingCount ?? 0}`}
        label={t('dashboard.pending')}
        iconColor={colors.gold}
        style={styles.statHalf}
      />
      <StatCard
        icon="account-group-outline"
        value={t('dashboard.totalMembers')}
        label="Community"
        iconColor="#608dd7"
        style={styles.statHalf}
      />
    </Animated.View>
  );
}

function QuickActions({ isAdmin, onAction }: {
  isAdmin: boolean; onAction: (key: string) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const items = [
    { key: 'pay',       icon: 'cash-plus' as const,            label: t('dashboard.payNow'),           color: colors.primary },
    { key: 'emergency', icon: 'alert-circle-outline' as const,  label: t('dashboard.requestEmergency'), color: colors.gold },
    { key: 'loans',     icon: 'handshake-outline' as const,     label: t('dashboard.viewLoans'),        color: colors.accent },
    isAdmin
      ? { key: 'admin',   icon: 'shield-crown-outline' as const, label: t('profile.admin'),      color: colors.danger }
      : { key: 'members', icon: 'account-group-outline' as const, label: t('dashboard.totalMembers'), color: '#ea80fc' },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(160)} style={styles.quickRow}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.quickItem}
          onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAction(item.key); }}
          accessibilityLabel={item.label}
          accessibilityRole="button"
        >
          <View style={[styles.quickIcon, { backgroundColor: `${item.color}18` }]}>
            <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
          </View>
          <Text style={[styles.quickLabel, { color: colors.text2 }]} numberOfLines={2}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}

function SectionHead({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.sectionHead}>
      <View style={[styles.sectionBar, { backgroundColor: colors.gold }]} />
      <Text style={[styles.sectionTitle, { color: colors.text3 }]}>{title.toUpperCase()}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn}>
          <Text style={[styles.seeAllText, { color: colors.primary }]}>{t('dashboard.seeAll')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function CommunityFeed() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data } = useCommunity();
  const items = (data?.payments ?? []).filter((p) => !p.pendingVerify).slice(0, 5);
  if (!items.length) return null;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(280)}>
      <SectionHead title={t('dashboard.communityActivity')} />
      <GlassCard style={styles.feedCard}>
        {items.map((p, i) => (
          <View
            key={p.id}
            style={[styles.feedRow, { borderBottomColor: colors.border1, borderBottomWidth: i < items.length - 1 ? 1 : 0 }]}
          >
            <Avatar name={p.member?.nameEn ?? 'Member'} color={p.member?.color} size="sm" />
            <View style={styles.feedInfo}>
              <Text style={[styles.feedName, { color: colors.text1 }]} numberOfLines={1}>
                {p.member?.nameEn ?? 'A member'}
              </Text>
              <Text style={[styles.feedMeta, { color: colors.text4 }]}>
                {t('dashboard.donated')} · {p.pool}
              </Text>
            </View>
            <Text style={[styles.feedAmount, { color: colors.gold }]}>{formatPKR(p.amount)}</Text>
          </View>
        ))}
      </GlassCard>
    </Animated.View>
  );
}

function AIFab() {
  const router = useRouter();
  const { colors } = useTheme();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.15, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1, false,
    );
  }, [pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.3 + (pulse.value - 1) * 2.5,
  }));

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/ai-assistant'); }}
      activeOpacity={0.85}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.fabGlow, glowStyle]} pointerEvents="none" />
      <MaterialCommunityIcons name="robot-outline" size={24} color="#0a0f1a" />
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notificationCount } = useAppStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data, isLoading, error, refetch, isRefetching } = useDashboard();
  const [searchVisible, setSearchVisible] = useState(false);

  if (isLoading && !data) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg0 }]} edges={['top']}>
        <View style={{ padding: spacing.md, gap: 12 }}>
          <Skeleton height={180} borderRadius={20} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SkeletonCard style={{ flex: 1 }} />
            <SkeletonCard style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SkeletonCard style={{ flex: 1 }} />
            <SkeletonCard style={{ flex: 1 }} />
          </View>
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  if (!isLoading && error) {
    return <EmptyState icon="wifi-off" title="Could not load dashboard" subtitle={error.message} actionLabel="Retry" onAction={() => refetch()} />;
  }

  const displayName = user?.nameEn ?? user?.nameUr ?? 'Member';
  const isAdmin = user?.role === 'admin';
  const total = (data?.fund?.sadaqah ?? 0) + (data?.fund?.zakat ?? 0) + (data?.fund?.qarz ?? 0);

  const handleAction = (key: string) => {
    if (key === 'pay') router.push('/(tabs)/payments');
    else if (key === 'emergency') router.push('/(tabs)/cases');
    else if (key === 'loans') router.push('/(tabs)/loans');
    else if (key === 'admin') router.push('/admin/');
    else router.push('/members/');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg0 }]} edges={['top']}>
      <GlobalSearch visible={searchVisible} onClose={() => setSearchVisible(false)} />
      <AIFab />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <Animated.View entering={FadeInDown.duration(350)}>
          <TopBar
            displayName={displayName}
            notifCount={notificationCount}
            onBell={() => router.push('/notifications')}
            onSearch={() => setSearchVisible(true)}
          />
        </Animated.View>

        {/* Fund hero */}
        <FundHero
          fund={data?.fund}
          pendingCount={data?.fund?.pendingCount}
        />

        {/* Payment status banner */}
        <PaymentBanner
          isPaid={!!data?.myCurrentMonth}
          pledge={user?.monthlyPledge}
          amount={user?.monthlyPledge}
          onPay={() => router.push('/(tabs)/payments')}
        />

        {/* 2×2 stats */}
        <StatsGrid
          pledge={user?.monthlyPledge}
          pendingCount={data?.fund?.pendingCount}
          isPaid={!!data?.myCurrentMonth}
        />

        {/* Quick actions */}
        <QuickActions isAdmin={isAdmin} onAction={handleAction} />

        {/* Recent activity */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <SectionHead
            title={t('dashboard.recentActivity')}
            onSeeAll={() => router.push('/notifications')}
          />
          <GlassCard style={styles.activityCard}>
            <ActivityFeed items={data?.recentActivity ?? []} />
          </GlassCard>
        </Animated.View>

        {/* Community feed */}
        <CommunityFeed />

        {/* Daily verse at bottom */}
        <Animated.View entering={FadeInDown.duration(400).delay(320)}>
          <DailyVerseCard />
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

export default DashboardScreen;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: 110 },
  // Top bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  topGreeting: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  topName: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginTop: 2 },
  topDate: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  topActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  notifDot: {
    position: 'absolute', top: 7, right: 7,
    minWidth: 15, height: 15, borderRadius: 8,
    paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center',
  },
  notifText: { color: '#fff', fontSize: 8, fontFamily: 'Inter_700Bold' },
  // Hero
  heroCard: {
    borderRadius: 20, padding: 20, marginBottom: spacing.md,
    overflow: 'hidden', position: 'relative',
    shadowColor: '#c89b3c', shadowOpacity: 0.25,
    shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  heroMotif: {
    position: 'absolute', right: 16, bottom: 12,
    fontSize: 100, color: 'rgba(0,0,0,0.08)', lineHeight: 110,
  },
  heroLabel: {
    fontSize: 10, fontFamily: 'Inter_700Bold',
    color: 'rgba(0,0,0,0.5)', letterSpacing: 2, textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 38, fontFamily: 'Inter_700Bold', color: '#0a0f1a',
    letterSpacing: -1.2, marginTop: 4, marginBottom: 14,
  },
  poolBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  poolSegment: { height: 6 },
  poolLegend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  poolLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  poolDot: { width: 7, height: 7, borderRadius: 4 },
  poolLegendLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'rgba(0,0,0,0.55)' },
  heroDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.15)', marginVertical: 10 },
  heroFooter: { flexDirection: 'row', gap: 14 },
  heroFooterText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(0,0,0,0.5)' },
  // Banner
  banner: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md,
  },
  bannerIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  bannerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  // Stats grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md,
  },
  statHalf: { width: '47.5%' },
  // Quick actions
  quickRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  quickItem: { alignItems: 'center', flex: 1, gap: 6 },
  quickIcon: {
    width: 54, height: 54, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 10.5, fontFamily: 'Inter_600SemiBold',
    textAlign: 'center', lineHeight: 14,
  },
  // Section head
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginBottom: spacing.sm, marginTop: spacing.md,
  },
  sectionBar: { width: 3, height: 13, borderRadius: 2 },
  sectionTitle: { fontSize: 10.5, fontFamily: 'Inter_700Bold', letterSpacing: 1.8, flex: 1 },
  seeAllBtn: { paddingVertical: 2 },
  seeAllText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  // Activity
  activityCard: { padding: spacing.md },
  // Community feed
  feedCard: { padding: 0, overflow: 'hidden' },
  feedRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  feedInfo: { flex: 1 },
  feedName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  feedMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2, textTransform: 'capitalize' },
  feedAmount: { fontSize: 13, fontFamily: 'SpaceMono_400Regular', fontWeight: '700' },
  // FAB
  fab: {
    position: 'absolute', bottom: 100, right: spacing.lg,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#c89b3c',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
    shadowColor: '#c89b3c', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 8,
    overflow: 'visible',
  },
  fabGlow: { borderRadius: 26, backgroundColor: 'rgba(200,155,60,0.3)' },
});

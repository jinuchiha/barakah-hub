import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { useAppStore } from '@/stores/app.store';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '@/hooks/useDashboard';
import { useCommunity } from '@/hooks/useCommunity';
import { ActivityFeed } from '@/components/ActivityFeed';
import { StatCard } from '@/components/ui/StatCard';
import { AnimatedNumber, fmtRsWorklet } from '@/components/ui/AnimatedNumber';
import { BarakahField } from '@/components/BarakahField';
import { WelcomeWipe } from '@/components/WelcomeWipe';
import { consumePendingWelcome } from '@/lib/welcome-flag';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { DailyVerseCard } from '@/components/DailyVerseCard';
import { GlobalSearch } from '@/components/GlobalSearch';
import { useTheme } from '@/lib/useTheme';
import { loop, duration } from '@/lib/motion';
import { MoneyText } from '@/components/ui/MoneyText';
import { Grain, HeroGlow } from '@/components/ui/Texture';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { spacing } from '@/lib/theme';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { format } from 'date-fns';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';

// ── Sub-components ────────────────────────────────────────────────────────────

function TopBar({ displayName, notifCount, onBell, onSearch, onAssistant }: {
  displayName: string; notifCount: number; onBell: () => void; onSearch: () => void; onAssistant: () => void;
}) {
  const { colors } = useTheme();
  const today = format(new Date(), 'EEE, d MMM');
  return (
    <View style={styles.topBar}>
      <View style={styles.topIdentity}>
        <Text style={[styles.topGreeting, { color: colors.brandGold }]} numberOfLines={1}>السلام عليكم</Text>
        <Text style={[styles.topName, { color: colors.text1 }]} numberOfLines={1}>{displayName}</Text>
        <Text style={[styles.topDate, { color: colors.text4 }]}>{today}</Text>
      </View>
      <View style={styles.topActions}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}
          onPress={onAssistant}
          accessibilityLabel="Barakah Assistant"
        >
          <MaterialCommunityIcons name="robot-happy-outline" size={19} color={colors.text2} />
        </TouchableOpacity>
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

/** Diagonal light sweep drifting across the hero — the web's aurora. */
function AuroraSweep() {
  // Static. This used to sweep on a 5200ms infinite loop; the depth it adds
  // is worth keeping, the perpetual movement is not.
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * 420 }, { rotate: '18deg' }],
  }));
  return (
    <Animated.View style={[styles.aurora, style]} pointerEvents="none">
      <LinearGradient
        colors={['transparent', 'rgba(217,176,76,0.16)', 'rgba(139,110,201,0.10)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
}

function LiveDot() {
  // Kept: this communicates live state rather than decorating. Gated, because
  // every surviving loop in the app must stop when the OS asks for less motion.
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduced) { pulse.value = 1; return; }
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: loop.pending / 2 }), withTiming(0, { duration: loop.pending / 2 })),
      -1, false,
    );
    return () => { cancelAnimation(pulse); };
  }, [pulse, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + pulse.value * 0.55 }));
  return (
    <View style={styles.liveWrap}>
      <Animated.View style={[styles.liveDot, style]} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

function FundHero({ fund, pendingCount, live = true }: {
  fund?: { sadaqah: number; zakat: number; qarz: number };
  pendingCount?: number;
  live?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sadaqah = fund?.sadaqah ?? 0;
  const zakat = fund?.zakat ?? 0;
  const qarz = fund?.qarz ?? 0;
  const total = sadaqah + zakat + qarz;

  // Pool colours come from the theme now. They were hardcoded — and the
  // sadaqah one was #c89b3c, the *web* gold, which had leaked into mobile.
  const pools = [
    { key: 'sadaqah', value: sadaqah, color: colors.brandGold, label: t('dashboard.sadaqahPool') },
    { key: 'zakat', value: zakat, color: colors.success, label: t('dashboard.zakatPool') },
    { key: 'qarz', value: qarz, color: colors.info, label: t('dashboard.qarzPool') },
  ].filter((p) => p.value > 0);

  return (
    <Animated.View entering={FadeInDown.duration(duration.emphasized)}>
      <LinearGradient
        colors={[colors.surfaceGradA, colors.bg2, colors.bg3]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.heroCard, { borderWidth: 1, borderColor: colors.border1 }]}
      >
        {/* Light rather than a border. A gold outline boxes the balance in;
            a halo behind it makes the figure read as the lit thing on the
            screen, which is what it is. */}
        <HeroGlow size={380} style={styles.heroGlow} />
        {live ? <AuroraSweep /> : null}

        <View style={styles.heroLabelRow}>
          <Text style={[styles.heroLabel, { color: colors.text3 }]}>{t('dashboard.totalFamilyFund')}</Text>
          {live ? <LiveDot /> : null}
        </View>
        {/* Counts up once on mount, then holds. Never loops. */}
        <AnimatedNumber value={total} format={fmtRsWorklet} style={styles.heroAmount} />

        {/* Composition as one bar rather than three tiles — the shares are
            the point, and a bar shows a share better than three numbers do. */}
        {total > 0 && (
          <View style={[styles.poolBar, { backgroundColor: colors.glass1 }]}>
            {pools.map((p) => (
              <View
                key={p.key}
                style={[styles.poolSegment, { backgroundColor: p.color, flex: p.value / total }]}
              />
            ))}
          </View>
        )}

        {/* Legend carries the amounts. A colour and a word alone told the
            reader nothing they could act on. */}
        {pools.length > 1 && (
          <View style={styles.poolLegend}>
            {pools.map((p) => (
              <View key={p.key} style={styles.poolLegendItem}>
                <View style={[styles.poolDot, { backgroundColor: p.color }]} />
                <View>
                  <Text style={[styles.poolLegendLabel, { color: colors.text4 }]}>{p.label}</Text>
                  <MoneyText amount={p.value} size="sm" color={colors.text2} />
                </View>
              </View>
            ))}
          </View>
        )}

        {(pendingCount ?? 0) > 0 && (
          <View style={[styles.heroFooter, { borderTopColor: colors.border1 }]}>
            <Text style={[styles.heroFooterText, { color: colors.warning }]}>
              {pendingCount} {t('dashboard.pending').toLowerCase()}
            </Text>
          </View>
        )}
        <Grain opacity={0.045} />
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
      <Animated.View entering={FadeInDown.duration(duration.standard)}>
        <GlassCard style={styles.banner}>
          <View style={[styles.bannerIcon, { backgroundColor: 'rgba(45,138,95,0.15)' }]}>
            <MaterialCommunityIcons name="check-circle" size={22} color="#4ec38d" />
          </View>
          <View style={styles.bannerText}>
            <Text style={[styles.bannerTitle, { color: '#4ec38d' }]}>{t('dashboard.thisMontPaid')}</Text>
            {amount ? <Text style={[styles.bannerSub, { color: colors.text3 }]}>{formatPKR(amount)}</Text> : null}
          </View>
          <Badge label={t('dashboard.verified')} variant="success" />
        </GlassCard>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(duration.standard)}>
      <GlassCard glowColor={colors.goldDim} style={styles.banner}>
        <View style={[styles.bannerIcon, { backgroundColor: 'rgba(200,155,60,0.12)' }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.gold} />
        </View>
        <View style={styles.bannerText}>
          <Text style={[styles.bannerTitle, { color: colors.gold }]}>{t('dashboard.paymentDue')}</Text>
          {pledge ? <Text style={[styles.bannerSub, { color: colors.text3 }]}>{formatPKR(pledge)}{t('dashboard.perMonth')}</Text> : null}
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
    <Animated.View entering={FadeInDown.duration(duration.standard)} style={styles.statsGrid}>
      <StatCard
        icon="hand-coin-outline"
        value={formatPKRFull(pledge ?? 0)}
        animateValue={pledge ?? 0}
        format={fmtRsWorklet}
        label={t('dashboard.myPledge')}
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
        animateValue={pendingCount ?? 0}
        label={t('dashboard.pending')}
        iconColor={colors.gold}
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
    { key: 'pay',       icon: 'cash-plus' as const,             label: t('dashboard.payNow'),           primary: true },
    { key: 'emergency', icon: 'alert-circle-outline' as const,  label: t('dashboard.requestEmergency'), primary: false },
    { key: 'loans',     icon: 'handshake-outline' as const,     label: t('dashboard.viewLoans'),        primary: false },
    isAdmin
      ? { key: 'admin',   icon: 'shield-crown-outline' as const,  label: t('profile.admin'),          primary: false }
      : { key: 'members', icon: 'account-group-outline' as const, label: t('dashboard.totalMembers'), primary: false },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(duration.standard)} style={styles.quickRow}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.quickItem}
          onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAction(item.key); }}
          accessibilityLabel={item.label}
          accessibilityRole="button"
        >
          <View
            style={[
              styles.quickIcon,
              item.primary
                ? { backgroundColor: colors.actionPrimary, borderColor: colors.actionPrimary }
                : { backgroundColor: 'transparent', borderColor: colors.border2 },
            ]}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={22}
              color={item.primary ? colors.onAction : colors.text2}
            />
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for when the section is wanted back
function CommunityFeed() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data, isLoading, isError } = useCommunity();
  const items = (data?.payments ?? []).slice(0, 5);

  if (isLoading) {
    return (
      <Animated.View entering={FadeInDown.duration(duration.standard)}>
        <SectionHead title={t('dashboard.communityActivity')} />
        <SkeletonCard />
      </Animated.View>
    );
  }

  if (isError || !items.length) return null;

  return (
    <Animated.View entering={FadeInDown.duration(duration.standard)}>
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


// ── Main Screen ───────────────────────────────────────────────────────────────

function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notificationCount } = useAppStore();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isRefetching } = useDashboard();
  const [searchVisible, setSearchVisible] = useState(false);
  const [activityOpen, setActivityOpen] = useState(true);
  // Tabs keep visited screens mounted — without this gate the star field,
  // aurora, LIVE dot and FAB pulse (30+ infinite UI-thread loops) keep
  // burning battery while the user is on another tab.
  const isFocused = useIsFocused();
  const [welcome, setWelcome] = useState<string | null>(() => consumePendingWelcome());

  const handleRefresh = () => {
    void refetch();
    void qc.invalidateQueries({ queryKey: ['dashboard', 'community'] });
  };

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

  if (!data && error) {
    return <EmptyState icon="wifi-off" title="Could not load dashboard" subtitle={error.message} actionLabel="Retry" onAction={() => refetch()} />;
  }

  const displayName = user?.nameEn ?? user?.nameUr ?? 'Member';
  const isAdmin = user?.role === 'admin';

  const handleAction = (key: string) => {
    if (key === 'pay') router.push('/(tabs)/payments');
    else if (key === 'emergency') router.push('/(tabs)/cases');
    else if (key === 'loans') router.push('/(tabs)/loans');
    else if (key === 'admin') router.push('/admin' as any);
    else router.push('/members' as any);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg0 }]} edges={['top']}>
      {isFocused ? <BarakahField dimmed /> : null}
      {welcome !== null ? <WelcomeWipe name={welcome} onDone={() => setWelcome(null)} /> : null}
      <GlobalSearch visible={searchVisible} onClose={() => setSearchVisible(false)} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.brandGold} colors={[colors.brandGold]} progressBackgroundColor={colors.bg2} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <Animated.View entering={FadeInDown.duration(350)}>
          <TopBar
            displayName={displayName}
            notifCount={notificationCount}
            onBell={() => router.push('/notifications')}
            onSearch={() => setSearchVisible(true)}
            onAssistant={() => router.push('/ai-assistant' as never)}
          />
        </Animated.View>

        {/* Quran verse — top of feed */}
        <Animated.View entering={FadeInDown.duration(duration.standard)}>
          <DailyVerseCard />
        </Animated.View>

        {/* Fund hero */}
        <FundHero
          fund={data?.fund}
          pendingCount={data?.fund?.pendingCount}
          live={isFocused}
        />

        {/* Payment status banner */}
        <PaymentBanner
          isPaid={!!data?.myCurrentMonth}
          pledge={user?.monthlyPledge}
          amount={data?.myCurrentMonth?.amount}
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

        {/* Recent activity — collapsible so history never dominates the
            dashboard; capped at 4 rows with See All for the rest. */}
        <Animated.View entering={FadeInDown.duration(duration.standard)}>
          <View style={styles.activityHeadRow}>
            <TouchableOpacity
              style={styles.activityToggle}
              onPress={() => setActivityOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: activityOpen }}
              accessibilityLabel={activityOpen ? 'Collapse recent activity' : 'Expand recent activity'}
            >
              <Text style={[styles.activityTitle, { color: colors.text3 }]}>{t('dashboard.recentActivity').toUpperCase()}</Text>
              <MaterialCommunityIcons name={activityOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text3} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')} accessibilityRole="button" accessibilityLabel="See all activity">
              <Text style={[styles.activitySeeAll, { color: colors.primary }]}>{t('dashboard.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          {activityOpen ? (
            <GlassCard style={styles.activityCard}>
              <ActivityFeed items={(data?.recentActivity ?? []).slice(0, 4)} />
            </GlassCard>
          ) : null}
        </Animated.View>

        {/* Community feed */}
        {/* Community Activity is hidden by product decision — a member's own
            position should not be read past someone else's contributions.
            <CommunityFeed /> */}
      </ScrollView>
    </SafeAreaView>
  );
}

export default DashboardScreen;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  activityHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 },
  activityToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  activityTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 1.2 },
  activitySeeAll: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: 150 },
  // Top bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  topIdentity: { flex: 1, minWidth: 0, paddingRight: 10 },
  topGreeting: {
    fontSize: 15, fontFamily: 'NotoNaskhArabic_600SemiBold',
    lineHeight: 26, writingDirection: 'rtl', includeFontPadding: true,
  },
  topName: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginTop: 2 },
  topDate: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  topActions: { flexDirection: 'row', gap: 8, marginTop: 4, flexShrink: 0 },
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
    shadowColor: '#000', shadowOpacity: 0.35,
    shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  heroGlow: { top: -110, left: -60, right: -60, bottom: -40 },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: {
    fontSize: 11, fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 42, lineHeight: 50, fontFamily: 'Inter_700Bold', color: '#ffffff',
    letterSpacing: -1.5, fontVariant: ['tabular-nums'],
    marginTop: 6, marginBottom: 16,
  },
  aurora: {
    position: 'absolute', top: -40, bottom: -40, left: -220, width: 200,
  },
  liveWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ec38d' },
  liveText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: 'rgba(78,195,141,0.9)', letterSpacing: 1.5 },
  poolBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  poolSegment: { height: 8 },
  poolLegend: { flexDirection: 'row', gap: 20, marginBottom: 4 },
  poolLegendItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  poolDot: { width: 7, height: 7, borderRadius: 4 },
  poolLegendLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.65)' },
  heroFooter: { flexDirection: 'row', gap: 14 },
  heroFooterText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.65)' },
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
    flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md,
  },
  statHalf: { flex: 1 },
  // Quick actions
  quickRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  quickItem: { alignItems: 'center', flex: 1, gap: 6 },
  quickIcon: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 1,
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
    shadowColor: '#c89b3c', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
    overflow: 'visible',
  },
  fabGlow: { borderRadius: 26, backgroundColor: 'rgba(200,155,60,0.3)' },
});

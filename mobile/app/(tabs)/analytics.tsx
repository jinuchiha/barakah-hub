import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/lib/useTheme';
import { useDashboard } from '@/hooks/useDashboard';
import { useAllPayments } from '@/hooks/usePayments';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { FundLineChart } from '@/components/charts/FundLineChart';
import { PoolDonutChart } from '@/components/charts/PoolDonutChart';
import { PaymentBarChart } from '@/components/charts/PaymentBarChart';
import { spacing } from '@/lib/theme';
import { format } from 'date-fns';
import { AnimatedNumber, fmtRsWorklet } from '@/components/ui/AnimatedNumber';

function SectionTitle({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionTitleBar, { backgroundColor: colors.gold }]} />
      <Text style={[styles.sectionTitle, { color: colors.text2 }]}>{label}</Text>
    </View>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <GlassCard style={styles.chartCard}>
      <Text style={[styles.chartTitle, { color: colors.text2 }]}>{title}</Text>
      {children}
    </GlassCard>
  );
}

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useDashboard();
  const { data: payments } = useAllPayments();

  const isAdmin = user?.role === 'admin';

  const paymentBarData = useMemo(() => {
    if (!payments) return [];
    const byMonth = new Map<string, number>();
    for (const p of payments) {
      const d = p.paidOn ? new Date(p.paidOn) : null;
      const key = p.monthLabel || (d && !Number.isNaN(d.getTime()) ? format(d, 'MMM yy') : 'Unknown');
      byMonth.set(key, (byMonth.get(key) ?? 0) + p.amount);
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => {
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const toMs = (label: string) => {
          const parts = label.split(' ');
          const mIdx = MONTHS.indexOf(parts[0]?.slice(0,3) ?? '');
          if (mIdx === -1 || !parts[1]) return 0;
          const d = new Date(`${parts[1]}-${String(mIdx + 1).padStart(2,'0')}-01`);
          return Number.isNaN(d.getTime()) ? 0 : d.getTime();
        };
        return toMs(a[0]) - toMs(b[0]);
      })
      .slice(-6)
      .map(([month, amount]) => ({ month, amount }));
  }, [payments]);

  const fundLineData = useMemo(() => {
    if (!data) return [];
    return [
      { month: 'Sadaqah', amount: data.fund?.sadaqah ?? 0 },
      { month: 'Zakat', amount: data.fund?.zakat ?? 0 },
      { month: 'Qarz', amount: data.fund?.qarz ?? 0 },
    ].filter((d) => d.amount > 0);
  }, [data]);

  if (!isAdmin) {
    return (
      <EmptyState
        icon="shield-lock-outline"
        title={t('analytics.adminOnly')}
        subtitle={t('analytics.adminOnlySub')}
        actionLabel={t('dashboard.goBack')}
        onAction={() => router.replace('/(tabs)' as never)}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandGold} colors={[colors.brandGold]} progressBackgroundColor={colors.bg2} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text1 }]}>{t('analytics.title')}</Text>
          <Text style={[styles.sub, { color: colors.text4 }]}>{t('analytics.subtitle')}</Text>
        </Animated.View>

        {isError ? (
          <EmptyState icon="alert-circle-outline" title={t('common.error')} actionLabel={t('common.retry')} onAction={() => void refetch()} />
        ) : isLoading ? (
          <>
            <SkeletonCard style={{ margin: 16 }} />
            <SkeletonCard style={{ margin: 16, marginTop: 0 }} />
            <SkeletonCard style={{ margin: 16, marginTop: 0 }} />
          </>
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <SectionTitle label={t('analytics.fundDistribution')} />
              <ChartCard title={t('analytics.poolBreakdown')}>
                <PoolDonutChart
                  sadaqah={data?.fund?.sadaqah ?? 0}
                  zakat={data?.fund?.zakat ?? 0}
                  qarz={data?.fund?.qarz ?? 0}
                />
              </ChartCard>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(200)}>
              <SectionTitle label={t('analytics.myPayments')} />
              <ChartCard title={t('analytics.monthlyContributions')}>
                <PaymentBarChart data={paymentBarData} />
              </ChartCard>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <SectionTitle label={t('analytics.fundBreakdown')} />
              <ChartCard title={t('analytics.sadaqahZakatQarz')}>
                <FundLineChart data={fundLineData} />
              </ChartCard>
            </Animated.View>
          </>
        )}

        {!isLoading && !isError && (
        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <SectionTitle label={t('analytics.summary')} />
          <GlassCard style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text3 }]}>{t('analytics.totalFund')}</Text>
              <AnimatedNumber
                value={(data?.fund?.sadaqah ?? 0) + (data?.fund?.zakat ?? 0) + (data?.fund?.qarz ?? 0)}
                format={fmtRsWorklet}
                style={[styles.summaryValue, { color: colors.primary }]}
              />
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text3 }]}>{t('analytics.pendingPayments')}</Text>
              <Text style={[styles.summaryValue, { color: colors.text1 }]}>{data?.fund?.pendingCount ?? 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text3 }]}>{t('analytics.myPaymentsCount')}</Text>
              <Text style={[styles.summaryValue, { color: colors.text1 }]}>{payments?.length ?? 0}</Text>
            </View>
          </GlassCard>
        </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 136 },
  header: { marginBottom: spacing.lg },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
  },
  sub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: spacing.sm, marginTop: spacing.md,
  },
  sectionTitleBar: { width: 3, height: 14, borderRadius: 2 },
  sectionTitle: {
    fontSize: 11.5,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.8,
  },
  chartCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  chartTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: spacing.md,
  },
  summaryCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  summaryValue: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
});

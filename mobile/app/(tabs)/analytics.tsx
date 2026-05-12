import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/lib/useTheme';
import { useDashboard } from '@/hooks/useDashboard';
import { useMyPayments } from '@/hooks/usePayments';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { FundLineChart } from '@/components/charts/FundLineChart';
import { PoolDonutChart } from '@/components/charts/PoolDonutChart';
import { PaymentBarChart } from '@/components/charts/PaymentBarChart';
import { spacing } from '@/lib/theme';
import { format } from 'date-fns';

function SectionTitle({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: colors.text4 }]}>{label}</Text>
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
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const { data, isLoading, refetch, isRefetching } = useDashboard();
  const { data: payments } = useMyPayments();

  const isAdmin = user?.role === 'admin';

  const paymentBarData = useMemo(() => {
    if (!payments) return [];
    const byMonth = new Map<string, number>();
    for (const p of payments) {
      const key = p.monthLabel || format(new Date(p.paidOn), 'MMM yy');
      byMonth.set(key, (byMonth.get(key) ?? 0) + p.amount);
    }
    return Array.from(byMonth.entries())
      .slice(-6)
      .map(([month, amount]) => ({ month, amount }));
  }, [payments]);

  const fundLineData = useMemo(() => {
    if (!data) return [];
    const total = data.fund.sadaqah + data.fund.zakat + data.fund.qarz;
    return [
      { month: 'Fund', amount: total },
    ];
  }, [data]);

  if (!isAdmin) {
    return (
      <EmptyState
        icon="shield-lock-outline"
        title="Admin Only"
        subtitle="Analytics are available to admins only."
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={[styles.title, { color: colors.text1 }]}>Analytics</Text>
          <Text style={[styles.sub, { color: colors.text4 }]}>Fund performance & insights</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <SectionTitle label="FUND DISTRIBUTION" />
          <ChartCard title="Pool Breakdown">
            <PoolDonutChart
              sadaqah={data?.fund.sadaqah ?? 0}
              zakat={data?.fund.zakat ?? 0}
              qarz={data?.fund.qarz ?? 0}
            />
          </ChartCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <SectionTitle label="MY PAYMENTS (LAST 6 MONTHS)" />
          <ChartCard title="Monthly Contributions">
            <PaymentBarChart data={paymentBarData} />
          </ChartCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <SectionTitle label="FUND GROWTH" />
          <ChartCard title="Total Fund Over Time">
            {isLoading ? (
              <View style={styles.placeholder} />
            ) : (
              <FundLineChart data={fundLineData} />
            )}
          </ChartCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <SectionTitle label="SUMMARY" />
          <GlassCard style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text3 }]}>Total Fund</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                PKR {((data?.fund.sadaqah ?? 0) + (data?.fund.zakat ?? 0) + (data?.fund.qarz ?? 0)).toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text3 }]}>Active Members</Text>
              <Text style={[styles.summaryValue, { color: colors.text1 }]}>{data?.memberCount ?? 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text3 }]}>My Payments</Text>
              <Text style={[styles.summaryValue, { color: colors.text1 }]}>{payments?.length ?? 0}</Text>
            </View>
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 120 },
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
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
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
  placeholder: { height: 120 },
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

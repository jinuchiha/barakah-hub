import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, RefreshControl,
} from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAnnualReport, useAuditLog, fetchExportCsv } from '@/hooks/useReports';
import { useAuthStore } from '@/stores/auth.store';
import { isAdminOnly } from '@/lib/roles';
import { shareCsv } from '@/lib/share';
import { formatPKR, formatRelativeTime } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing } from '@/lib/theme';

const CURRENT_YEAR = new Date().getFullYear();
const EXPORTS: Array<{ kind: 'members' | 'fund' | 'loans' | 'audit'; label: string }> = [
  { kind: 'fund', label: 'Fund' },
  { kind: 'members', label: 'Members' },
  { kind: 'loans', label: 'Loans' },
  { kind: 'audit', label: 'Audit' },
];

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const annual = useAnnualReport(CURRENT_YEAR);
  const audit = useAuditLog();
  const [exporting, setExporting] = useState<string | null>(null);

  if (!isAdminOnly(user?.role)) return <Redirect href="/admin" />;

  const doExport = async (kind: 'members' | 'fund' | 'loans' | 'audit') => {
    setExporting(kind);
    try {
      const csv = await fetchExportCsv(kind);
      await shareCsv(`barakah-${kind}-${CURRENT_YEAR}.csv`, csv);
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Could not export');
    } finally {
      setExporting(null);
    }
  };

  const r = annual.data;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Reports' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={annual.isRefetching} onRefresh={annual.refetch} tintColor={colors.primary} />}
      >
        <Text style={[styles.section, { color: colors.text4 }]}>{CURRENT_YEAR} ANNUAL SUMMARY</Text>
        {annual.isLoading ? (
          <EmptyState icon="loading" title="Loading…" />
        ) : r ? (
          <>
            <GlassCard style={styles.totalCard}>
              <Text style={[styles.totalLabel, { color: colors.text3 }]}>Total Collected</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>{formatPKR(r.collected.total)}</Text>
              <Text style={[styles.totalSub, { color: colors.text4 }]}>{r.collected.count} verified payments</Text>
            </GlassCard>
            <View style={styles.grid}>
              <StatCard icon="hand-heart-outline" value={formatPKR(r.collected.sadaqah)} label="Sadaqah" style={styles.stat} />
              <StatCard icon="star-circle-outline" value={formatPKR(r.collected.zakat)} label="Zakat" iconColor={colors.accent} style={styles.stat} />
              <StatCard icon="cash-fast" value={formatPKR(r.cases.disbursedAmount)} label="Disbursed" iconColor={colors.gold} style={styles.stat} />
              <StatCard icon="handshake-outline" value={formatPKR(r.loans.issuedAmount)} label="Loans Issued" iconColor={colors.accent} style={styles.stat} />
              <StatCard icon="cash-refund" value={formatPKR(r.loans.repaidAmount)} label="Loans Repaid" style={styles.stat} />
              <StatCard icon="account-group-outline" value={`${r.members.total}`} label={`Members (+${r.members.newThisYear})`} iconColor={colors.primary} style={styles.stat} />
            </View>
          </>
        ) : (
          <EmptyState icon="alert-circle-outline" title="Couldn't load report" />
        )}

        <Text style={[styles.section, { color: colors.text4 }]}>EXPORT CSV</Text>
        <View style={styles.exportRow}>
          {EXPORTS.map((e) => (
            <Button
              key={e.kind}
              label={exporting === e.kind ? '…' : e.label}
              onPress={() => doExport(e.kind)}
              loading={exporting === e.kind}
              variant="primary"
              size="sm"
              style={styles.exportBtn}
            />
          ))}
        </View>

        <Text style={[styles.section, { color: colors.text4 }]}>RECENT AUDIT LOG</Text>
        {audit.isLoading ? (
          <EmptyState icon="loading" title="Loading…" />
        ) : (audit.data ?? []).length === 0 ? (
          <EmptyState icon="history" title="No activity" />
        ) : (
          (audit.data ?? []).slice(0, 40).map((a) => (
            <View key={a.id} style={[styles.auditRow, { borderBottomColor: colors.border1 }]}>
              <View style={styles.flex}>
                <Text style={[styles.auditAction, { color: colors.text1 }]}>
                  {a.action.replace(/-/g, ' ')}
                </Text>
                {a.detail ? <Text style={[styles.auditDetail, { color: colors.text3 }]} numberOfLines={1}>{a.detail}</Text> : null}
              </View>
              <View style={styles.auditMeta}>
                <Text style={[styles.auditActor, { color: colors.text4 }]}>{a.actor}</Text>
                <Text style={[styles.auditTime, { color: colors.text4 }]}>{formatRelativeTime(a.createdAt)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 60 },
  section: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm },
  totalCard: { padding: spacing.lg, alignItems: 'center', marginBottom: spacing.sm },
  totalLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  totalValue: { fontSize: 28, fontFamily: 'SpaceMono_400Regular', fontWeight: '700', marginVertical: 4 },
  totalSub: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexBasis: '47%', flexGrow: 1 },
  exportRow: { flexDirection: 'row', gap: spacing.sm },
  exportBtn: { flex: 1 },
  auditRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  auditAction: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' },
  auditDetail: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  auditMeta: { alignItems: 'flex-end' },
  auditActor: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  auditTime: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 1 },
});

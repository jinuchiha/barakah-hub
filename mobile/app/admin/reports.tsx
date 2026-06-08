import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, RefreshControl, TouchableOpacity,
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
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { shareCsv } from '@/lib/share';
import { formatPKR, formatRelativeTime } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

const MIN_YEAR = 2020;
const AUDIT_FILTERS = ['All', 'payment', 'member', 'case', 'loan'] as const;

const EXPORTS: Array<{ kind: 'members' | 'fund' | 'loans' | 'audit'; label: string }> = [
  { kind: 'fund', label: 'Fund' },
  { kind: 'members', label: 'Members' },
  { kind: 'loans', label: 'Loans' },
  { kind: 'audit', label: 'Audit' },
];

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { user, isLoading: authLoading } = useAuthStore();
  const [year, setYear] = useState(new Date().getFullYear());
  const [actionFilter, setActionFilter] = useState('');
  const annual = useAnnualReport(year);
  const audit = useAuditLog();
  const [exporting, setExporting] = useState<string | null>(null);

  if (authLoading) return <LoadingScreen />;
  if (!isAdminOnly(user?.role)) return <Redirect href="/admin" />;

  const currentYear = new Date().getFullYear();

  const doExport = async (kind: 'members' | 'fund' | 'loans' | 'audit') => {
    setExporting(kind);
    try {
      const csv = await fetchExportCsv(kind, year);
      await shareCsv(`barakah-${kind}-${year}.csv`, csv);
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Could not export');
    } finally {
      setExporting(null);
    }
  };

  const filtered = (audit.data ?? [])
    .filter((a) => !actionFilter || a.action.startsWith(actionFilter))
    .slice(0, 50);

  const r = annual.data;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Reports' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={annual.isRefetching} onRefresh={annual.refetch} tintColor={colors.primary} />}
      >
        {/* Year selector */}
        <View style={styles.yearRow}>
          <TouchableOpacity
            onPress={() => setYear((y) => Math.max(MIN_YEAR, y - 1))}
            style={[styles.yearBtn, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}
            disabled={year <= MIN_YEAR}
          >
            <Text style={[styles.yearBtnText, { color: year <= MIN_YEAR ? colors.text4 : colors.text1 }]}>◀ prev</Text>
          </TouchableOpacity>
          <Text style={[styles.yearLabel, { color: colors.text1 }]}>{year}</Text>
          <TouchableOpacity
            onPress={() => setYear((y) => Math.min(currentYear, y + 1))}
            style={[styles.yearBtn, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}
            disabled={year >= currentYear}
          >
            <Text style={[styles.yearBtnText, { color: year >= currentYear ? colors.text4 : colors.text1 }]}>next ▶</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.section, { color: colors.text4 }]}>{year} ANNUAL SUMMARY</Text>
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
        {/* Audit filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          {AUDIT_FILTERS.map((f) => {
            const active = f === 'All' ? actionFilter === '' : actionFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setActionFilter(f === 'All' ? '' : f)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primaryDim : colors.glass2,
                    borderColor: active ? colors.primary : colors.border1,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? colors.primary : colors.text3 }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {audit.isLoading ? (
          <EmptyState icon="loading" title="Loading…" />
        ) : filtered.length === 0 ? (
          <EmptyState icon="history" title="No activity" />
        ) : (
          filtered.map((a) => (
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
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  yearBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1 },
  yearBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  yearLabel: { fontSize: 20, fontFamily: 'SpaceMono_400Regular', fontWeight: '700' },
  totalCard: { padding: spacing.lg, alignItems: 'center', marginBottom: spacing.sm },
  totalLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  totalValue: { fontSize: 28, fontFamily: 'SpaceMono_400Regular', fontWeight: '700', marginVertical: 4 },
  totalSub: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexBasis: '47%', flexGrow: 1 },
  exportRow: { flexDirection: 'row', gap: spacing.sm },
  exportBtn: { flex: 1 },
  chipScroll: { marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  auditRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  auditAction: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' },
  auditDetail: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  auditMeta: { alignItems: 'flex-end' },
  auditActor: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  auditTime: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 1 },
});

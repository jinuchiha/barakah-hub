import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, Redirect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMembers } from '@/hooks/useMembers';
import { useIssueLoan } from '@/hooks/useLoans';
import { useAuthStore } from '@/stores/auth.store';
import { isAdminOnly } from '@/lib/roles';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { formatPKR } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import type { Member } from '@/types';

export default function IssueLoanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, isLoading: authLoading } = useAuthStore();
  const { data: members } = useMembers();
  const issue = useIssueLoan();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Member | null>(null);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');

  const candidates = useMemo(() => {
    const list = (members ?? []).filter((m) => m.status === 'approved' && !m.deceased);
    const q = search.trim().toLowerCase();
    if (!q) return list.slice(0, 20);
    return list.filter((m) => `${m.nameEn} ${m.nameUr}`.toLowerCase().includes(q)).slice(0, 20);
  }, [members, search]);

  if (authLoading) return <LoadingScreen />;
  if (!isAdminOnly(user?.role)) return <Redirect href="/admin" />;

  const submit = async () => {
    const amt = parseInt(amount, 10);
    if (!selected) { Alert.alert('Select a member'); return; }
    if (!amt || amt <= 0) { Alert.alert('Enter a valid amount'); return; }
    if (purpose.trim().length < 2) { Alert.alert('Enter a purpose'); return; }
    try {
      await issue.mutateAsync({
        memberId: selected.id,
        amount: amt,
        purpose: purpose.trim(),
        city: selected.city ?? undefined,
        expectedReturn: expectedReturn.trim() || null,
      });
      Alert.alert('Loan Issued', `${formatPKR(amt)} qarz issued to ${selected.nameEn}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Could not issue loan');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Issue Qarz Loan' }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.sectionLabel, { color: colors.text4 }]}>BORROWER</Text>
          {selected ? (
            <TouchableOpacity onPress={() => setSelected(null)}>
              <GlassCard style={styles.selectedCard}>
                <Avatar name={selected.nameEn} color={selected.color} size="sm" />
                <View style={styles.flex}>
                  <Text style={[styles.name, { color: colors.text1 }]}>{selected.nameEn}</Text>
                  <Text style={[styles.sub, { color: colors.text3 }]}>{selected.city ?? 'Tap to change'}</Text>
                </View>
                <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.text3} />
              </GlassCard>
            </TouchableOpacity>
          ) : (
            <>
              <View style={[styles.searchWrap, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}>
                <MaterialCommunityIcons name="magnify" size={18} color={colors.text3} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text1 }]}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search member..."
                  placeholderTextColor={colors.text4}
                />
              </View>
              {candidates.length === 0 ? (
                <EmptyState icon="account-search" title="No members" />
              ) : (
                candidates.map((m) => (
                  <TouchableOpacity key={m.id} onPress={() => setSelected(m)}>
                    <View style={[styles.row, { borderBottomColor: colors.border1 }]}>
                      <Avatar name={m.nameEn} color={m.color} size="sm" />
                      <View style={styles.flex}>
                        <Text style={[styles.name, { color: colors.text1 }]}>{m.nameEn}</Text>
                        {m.nameUr ? <Text style={[styles.sub, { color: colors.text3 }]}>{m.nameUr}</Text> : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}

          {selected ? (
            <>
              <View style={styles.gap} />
              <Input label="Amount (PKR)" value={amount} onChangeText={setAmount} keyboardType="numeric" leftIcon="cash" />
              <Input label="Purpose" value={purpose} onChangeText={setPurpose} leftIcon="text" placeholder="e.g. medical, education" />
              <Input label="Expected Return (optional)" value={expectedReturn} onChangeText={setExpectedReturn} leftIcon="calendar" placeholder="e.g. Dec 2026" />
              <Button
                label={issue.isPending ? 'Issuing…' : 'Issue Qarz Loan'}
                onPress={submit}
                loading={issue.isPending}
                variant="solid"
                fullWidth
                style={styles.submitBtn}
              />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 60 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, marginBottom: spacing.sm },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1, marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  selectedCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  name: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  sub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  gap: { height: spacing.lg },
  submitBtn: { marginTop: spacing.md },
});

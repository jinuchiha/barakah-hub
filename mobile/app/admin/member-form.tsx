import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams, Redirect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMembers, useAddMember, useEditMember } from '@/hooks/useMembers';
import { useAuthStore } from '@/stores/auth.store';
import { isAdminOnly, roleLabel } from '@/lib/roles';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import type { Member, Role, MemberStatus } from '@/types';

const ROLES: Role[] = ['member', 'supervisor', 'admin'];
const STATUSES: MemberStatus[] = ['pending', 'approved', 'rejected'];

function Segmented<T extends string>({ options, value, onChange, labelOf }: {
  options: T[]; value: T; onChange: (v: T) => void; labelOf?: (v: T) => string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.segRow}>
      {options.map((o) => (
        <TouchableOpacity
          key={o}
          onPress={() => onChange(o)}
          style={[styles.seg, { backgroundColor: value === o ? colors.primaryDim : colors.glass2, borderColor: value === o ? colors.primary : colors.border1 }]}
        >
          <Text style={[styles.segText, { color: value === o ? colors.primary : colors.text3 }]}>
            {labelOf ? labelOf(o) : o}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function MemberFormScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, isLoading: authLoading } = useAuthStore();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: members, isLoading: membersLoading } = useMembers();
  const add = useAddMember();
  const edit = useEditMember();

  const existing = useMemo(() => members?.find((m) => m.id === id), [members, id]);
  const isEdit = Boolean(id);

  const [nameEn, setNameEn] = useState(existing?.nameEn ?? '');
  const [nameUr, setNameUr] = useState(existing?.nameUr ?? '');
  const [username, setUsername] = useState(existing?.username ?? '');
  const [fatherName, setFatherName] = useState(existing?.fatherName && existing.fatherName !== '—' ? existing.fatherName : '');
  const [fatherDeceased, setFatherDeceased] = useState(existing?.fatherDeceased ?? false);
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [pledge, setPledge] = useState(String(existing?.monthlyPledge ?? 1000));
  const [role, setRole] = useState<Role>(existing?.role ?? 'member');
  const [status, setStatus] = useState<MemberStatus>(existing?.status ?? 'approved');
  const [spouseId, setSpouseId] = useState<string | null>(existing?.spouseId ?? null);
  const [spouseSearch, setSpouseSearch] = useState('');
  const [pickingSpouse, setPickingSpouse] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setNameEn(existing.nameEn ?? '');
    setNameUr(existing.nameUr ?? '');
    setUsername(existing.username ?? '');
    setFatherName(existing.fatherName && existing.fatherName !== '—' ? existing.fatherName : '');
    setFatherDeceased(existing.fatherDeceased ?? false);
    setPhone(existing.phone ?? '');
    setCity(existing.city ?? '');
    setPledge(String(existing.monthlyPledge ?? 1000));
    setRole(existing.role ?? 'member');
    setStatus(existing.status ?? 'approved');
    setSpouseId(existing.spouseId ?? null);
  }, [existing?.id]);

  const spouse = members?.find((m) => m.id === spouseId);
  const spouseCandidates = useMemo(() => {
    const q = spouseSearch.trim().toLowerCase();
    return (members ?? [])
      .filter((m) => m.id !== id && !m.deceased)
      .filter((m) => !q || `${m.nameEn} ${m.nameUr}`.toLowerCase().includes(q))
      .slice(0, 15);
  }, [members, spouseSearch, id]);

  if (authLoading) return <LoadingScreen />;
  if (!isAdminOnly(user?.role)) return <Redirect href="/admin" />;
  if (isEdit && membersLoading) return <LoadingScreen />;

  const submit = async () => {
    if (nameEn.trim().length < 2) { Alert.alert('Name required'); return; }
    try {
      if (isEdit && id) {
        await edit.mutateAsync({
          id, nameEn, nameUr: nameUr || undefined, fatherName: fatherName || undefined,
          fatherDeceased,
          phone: phone || null, city: city || null,
          monthlyPledge: parseInt(pledge, 10) || 0, role, status, spouseId,
        });
      } else {
        if (username.trim().length < 2) { Alert.alert('Username required'); return; }
        await add.mutateAsync({
          username: username.trim(), nameEn: nameEn.trim(), nameUr: (nameUr || nameEn).trim(),
          fatherName: (fatherName || '—').trim(), fatherDeceased, phone: phone || undefined,
          city: city || undefined, monthlyPledge: parseInt(pledge, 10) || 1000,
        });
      }
      Alert.alert(isEdit ? 'Member updated' : 'Member added', '', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Could not save');
    }
  };

  const pending = add.isPending || edit.isPending;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      <Stack.Screen options={{ title: isEdit ? 'Edit Member' : 'Add Member' }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Input label="Full Name (English)" value={nameEn} onChangeText={setNameEn} autoCapitalize="words" />
          <Input label="نام (Urdu)" value={nameUr} onChangeText={setNameUr} />
          {!isEdit ? (
            <Input label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="lowercase, no spaces" />
          ) : null}
          <Input label="Father's Name" value={fatherName} onChangeText={setFatherName} autoCapitalize="words" placeholder="Links siblings in the tree" />
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.text2 }]}>Father has passed away (Marhoom)</Text>
            <Switch
              value={fatherDeceased}
              onValueChange={setFatherDeceased}
              trackColor={{ false: colors.bg4, true: colors.primaryDim }}
              thumbColor={colors.primary}
            />
          </View>
          <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label="City" value={city} onChangeText={setCity} autoCapitalize="words" />
          <Input label="Monthly Pledge (PKR)" value={pledge} onChangeText={setPledge} keyboardType="numeric" />

          {isEdit ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text4 }]}>ROLE</Text>
              <Segmented options={ROLES} value={role} onChange={setRole} labelOf={(r) => roleLabel(r)} />
              <Text style={[styles.sectionLabel, { color: colors.text4 }]}>STATUS</Text>
              <Segmented options={STATUSES} value={status} onChange={setStatus} />
            </>
          ) : null}

          <Text style={[styles.sectionLabel, { color: colors.text4 }]}>SPOUSE (couples render side-by-side)</Text>
          {spouse && !pickingSpouse ? (
            <View style={[styles.spouseRow, { borderColor: colors.border1 }]}>
              <Avatar name={spouse.nameEn} color={spouse.color} size="sm" />
              <Text style={[styles.spouseName, { color: colors.text1 }]}>{spouse.nameEn}</Text>
              <TouchableOpacity onPress={() => setSpouseId(null)}>
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity onPress={() => setPickingSpouse((p) => !p)}>
                <Text style={[styles.linkSpouse, { color: colors.primary }]}>
                  {pickingSpouse ? 'Close' : '+ Link a spouse'}
                </Text>
              </TouchableOpacity>
              {pickingSpouse ? (
                <>
                  <TextInput
                    style={[styles.search, { color: colors.text1, borderColor: colors.border1, backgroundColor: colors.glass1 }]}
                    value={spouseSearch}
                    onChangeText={setSpouseSearch}
                    placeholder="Search member..."
                    placeholderTextColor={colors.text4}
                  />
                  {spouseCandidates.length === 0 ? (
                    <EmptyState icon="account-search" title="No members" />
                  ) : (
                    spouseCandidates.map((m: Member) => (
                      <TouchableOpacity key={m.id} onPress={() => { setSpouseId(m.id); setPickingSpouse(false); }}>
                        <View style={[styles.candidate, { borderBottomColor: colors.border1 }]}>
                          <Avatar name={m.nameEn} color={m.color} size="sm" />
                          <Text style={[styles.spouseName, { color: colors.text1 }]}>{m.nameEn}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              ) : null}
            </>
          )}

          <Button
            label={pending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Member'}
            onPress={submit}
            loading={pending}
            variant="solid"
            fullWidth
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 60 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, marginTop: spacing.md, marginBottom: spacing.sm },
  segRow: { flexDirection: 'row', gap: spacing.sm },
  seg: { flex: 1, paddingVertical: 10, borderRadius: radius.full, borderWidth: 1.5, alignItems: 'center' },
  segText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, marginBottom: spacing.sm },
  switchLabel: { fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1, marginRight: spacing.md },
  spouseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderRadius: radius.md },
  spouseName: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  linkSpouse: { fontSize: 14, fontFamily: 'Inter_600SemiBold', paddingVertical: spacing.sm },
  search: {
    borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: spacing.sm,
  },
  candidate: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  submit: { marginTop: spacing.lg },
});

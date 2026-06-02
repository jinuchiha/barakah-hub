import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity,
} from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth.store';
import { isAdminOnly } from '@/lib/roles';
import { api } from '@/lib/api';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

interface FundConfig {
  voteThresholdPct?: number;
  defaultMonthlyPledge?: number;
  goalAmount?: number;
  goalLabelEn?: string;
  goalLabelUr?: string;
  easyPaiseName?: string | null;
  easyPaiseNumber?: string | null;
}

export default function AdminConfigScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [config, setConfig] = useState<FundConfig>({});
  const [thresh, setThresh] = useState(50);
  const [pledge, setPledge] = useState('1000');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalEn, setGoalEn] = useState('');
  const [easyPaiseName, setEasyPaiseName] = useState('');
  const [easyPaiseNumber, setEasyPaiseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get<FundConfig>('/api/config').then(({ data }) => {
      setConfig(data);
      setThresh(data.voteThresholdPct ?? 50);
      setPledge(String(data.defaultMonthlyPledge ?? 1000));
      setGoalAmount(data.goalAmount ? String(data.goalAmount) : '');
      setGoalEn(data.goalLabelEn ?? '');
      setEasyPaiseName(data.easyPaiseName ?? '');
      setEasyPaiseNumber(data.easyPaiseNumber ?? '');
      setLoaded(true);
    }).catch(() => Alert.alert('Error', 'Could not load configuration'));
  }, []);

  if (!isAdminOnly(user?.role)) return <Redirect href="/admin" />;

  const save = async () => {
    setLoading(true);
    try {
      await api.patch('/api/config', {
        voteThresholdPct: thresh,
        defaultMonthlyPledge: parseInt(pledge, 10) || 1000,
        goalAmount: parseInt(goalAmount, 10) || 0,
        goalLabelEn: goalEn.trim() || undefined,
        easyPaiseName: easyPaiseName.trim() || null,
        easyPaiseNumber: easyPaiseNumber.trim() || null,
      });
      Alert.alert('Saved', 'Configuration updated successfully.');
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Could not save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Fund Configuration' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Vote threshold */}
        <Text style={[styles.section, { color: colors.text4 }]}>EMERGENCY VOTE</Text>
        <GlassCard style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text2 }]}>Approval threshold</Text>
            <Text style={[styles.threshValue, { color: colors.primary }]}>{thresh}%</Text>
          </View>
          <View style={styles.stepRow}>
            {[30, 40, 50, 55, 60, 65, 70, 75].map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setThresh(v)}
                style={[
                  styles.stepBtn,
                  {
                    backgroundColor: thresh === v ? colors.primaryDim : colors.glass2,
                    borderColor: thresh === v ? colors.primary : colors.border1,
                  },
                ]}
              >
                <Text style={[styles.stepText, { color: thresh === v ? colors.primary : colors.text3 }]}>
                  {v}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.hint, { color: colors.text4 }]}>
            Higher = more consensus required. 50% = simple majority.
          </Text>
        </GlassCard>

        {/* Default pledge */}
        <Text style={[styles.section, { color: colors.text4 }]}>DEFAULTS</Text>
        <GlassCard style={styles.card}>
          <Input
            label="Default monthly pledge (PKR)"
            value={pledge}
            onChangeText={setPledge}
            keyboardType="numeric"
            leftIcon="cash"
          />
        </GlassCard>

        {/* Goal */}
        {/* EasyPaisa */}
        <Text style={[styles.section, { color: colors.text4 }]}>EASYPAISE COLLECTION ACCOUNT</Text>
        <GlassCard style={styles.card}>
          <Text style={{ color: colors.text3, fontSize: 12, marginBottom: spacing.md }}>
            Supervisor ka personal EasyPaisa number — members ko payment submit karte waqt dikhe ga.
          </Text>
          <Input label="Account Holder Name" value={easyPaiseName} onChangeText={setEasyPaiseName} placeholder="e.g. Muhammad Ali" autoCapitalize="words" />
          <Input label="EasyPaisa Number" value={easyPaiseNumber} onChangeText={setEasyPaiseNumber} placeholder="e.g. 0300-1234567" keyboardType="phone-pad" />
        </GlassCard>

        <Text style={[styles.section, { color: colors.text4 }]}>FAMILY GOAL</Text>
        <GlassCard style={styles.card}>
          <Input
            label="Goal label (English)"
            value={goalEn}
            onChangeText={setGoalEn}
            placeholder="e.g. Eid-ul-Fitr Goal"
          />
          <Input
            label="Target amount (PKR, 0 = no goal)"
            value={goalAmount}
            onChangeText={setGoalAmount}
            keyboardType="numeric"
            leftIcon="target"
          />
        </GlassCard>

        <Button
          label={loading ? 'Saving…' : 'Save Configuration'}
          onPress={save}
          loading={loading}
          disabled={!loaded}
          variant="solid"
          fullWidth
          style={styles.saveBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: 60 },
  section: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.5, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { padding: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  label: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  threshValue: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  stepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  stepBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5 },
  stepText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  hint: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  saveBtn: { marginTop: spacing.lg },
});

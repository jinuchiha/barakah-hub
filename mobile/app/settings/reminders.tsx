import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  loadReminderPrefs, saveReminderPrefs, applyReminderPrefs, type ReminderPrefs,
} from '@/lib/reminders';

const PAYMENT_DAYS = [1, 5, 10, 15, 20, 25];
const VERSE_HOURS = [6, 7, 8, 9, 18, 20, 21];

function formatHour(h: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:00 ${ampm}`;
}

export default function RemindersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [prefs, setPrefs] = useState<ReminderPrefs>(() => loadReminderPrefs());
  const [saving, setSaving] = useState(false);

  const update = (partial: Partial<ReminderPrefs>) => {
    setPrefs((p) => ({ ...p, ...partial }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      saveReminderPrefs(prefs);
      await applyReminderPrefs(prefs);
      Alert.alert('Saved', 'Reminder settings updated.');
    } catch {
      Alert.alert('Error', 'Could not schedule reminders. Check notification permissions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>Reminders</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(300)}>
          <GlassCard style={styles.section}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <MaterialCommunityIcons name="cash-lock" size={20} color={colors.gold} />
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text1 }]}>Monthly Payment Reminder</Text>
                  <Text style={[styles.rowDesc, { color: colors.text3 }]}>Remind to pay on selected day</Text>
                </View>
              </View>
              <Switch
                value={prefs.paymentReminder}
                onValueChange={(v) => update({ paymentReminder: v })}
                trackColor={{ false: colors.bg4, true: colors.primaryDim }}
                thumbColor={colors.primary}
              />
            </View>

            {prefs.paymentReminder ? (
              <View style={styles.chipRow}>
                {PAYMENT_DAYS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: prefs.paymentDay === d ? colors.primary : colors.glass3,
                        borderColor: prefs.paymentDay === d ? colors.primary : colors.border1,
                      },
                    ]}
                    onPress={() => update({ paymentDay: d })}
                  >
                    <Text style={[styles.chipText, { color: prefs.paymentDay === d ? '#000' : colors.text2 }]}>
                      {d}th
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(80)}>
          <GlassCard style={styles.section}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <MaterialCommunityIcons name="book-open-variant" size={20} color={colors.accent} />
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text1 }]}>Daily Quran Verse</Text>
                  <Text style={[styles.rowDesc, { color: colors.text3 }]}>Morning reflection notification</Text>
                </View>
              </View>
              <Switch
                value={prefs.dailyVerse}
                onValueChange={(v) => update({ dailyVerse: v })}
                trackColor={{ false: colors.bg4, true: colors.accentDim }}
                thumbColor={colors.accent}
              />
            </View>

            {prefs.dailyVerse ? (
              <View style={styles.chipRow}>
                {VERSE_HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: prefs.dailyVerseHour === h ? colors.accent : colors.glass3,
                        borderColor: prefs.dailyVerseHour === h ? colors.accent : colors.border1,
                      },
                    ]}
                    onPress={() => update({ dailyVerseHour: h })}
                  >
                    <Text style={[styles.chipText, { color: prefs.dailyVerseHour === h ? '#fff' : colors.text2 }]}>
                      {formatHour(h)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(160)}>
          <GlassCard style={styles.section}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <MaterialCommunityIcons name="mosque" size={20} color={colors.primary} />
                <View>
                  <Text style={[styles.rowTitle, { color: colors.text1 }]}>Prayer Time Notifications</Text>
                  <Text style={[styles.rowDesc, { color: colors.text3 }]}>Get notified for all 5 prayers</Text>
                </View>
              </View>
              <Switch
                value={prefs.prayerNotifications}
                onValueChange={(v) => update({ prayerNotifications: v })}
                trackColor={{ false: colors.bg4, true: colors.primaryDim }}
                thumbColor={colors.primary}
              />
            </View>
          </GlassCard>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border1, backgroundColor: colors.bg1 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saving ? colors.primaryDim : colors.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Reminders'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 20 },
  section: { padding: spacing.md, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  rowTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  rowDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  footer: { padding: spacing.md, borderTopWidth: 1 },
  saveBtn: {
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: { color: '#000', fontSize: 15, fontFamily: 'Inter_700Bold' },
});

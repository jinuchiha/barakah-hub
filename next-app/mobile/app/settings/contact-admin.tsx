import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

const schema = z.object({
  subject: z.string().min(3, 'Subject is required').max(120),
  body: z.string().min(10, 'Please describe the issue (min 10 characters)').max(2000),
});

type FormData = z.infer<typeof schema>;

/**
 * Contact Admin — sends a message via the existing /api/messages flow,
 * targeted at the first available admin. Falls back to mailto: if the
 * server send fails (network down, no admin found, etc).
 */
export default function ContactAdminScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const [sending, setSending] = useState(false);

  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { subject: '', body: '' },
  });

  const onSubmit = async (data: FormData) => {
    setSending(true);
    try {
      await api.post('/api/messages/to-admin', {
        subject: data.subject,
        body: data.body,
      });
      reset();
      Alert.alert(
        'Message sent',
        'An admin will read your message shortly. You can also reach them in the Messages tab.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send';
      Alert.alert(
        'Could not send through the app',
        `${msg}\n\nWould you like to open your email app instead?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Email',
            onPress: () => {
              const mailto = `mailto:?subject=${encodeURIComponent('[Barakah Hub] ' + data.subject)}&body=${encodeURIComponent(`From: ${user?.nameEn ?? ''}\n\n${data.body}`)}`;
              Linking.openURL(mailto).catch(() => {});
            },
          },
        ],
      );
    } finally {
      setSending(false);
    }
  };

  const onInvalid = (formErrors: FieldErrors<FormData>) => {
    const first = Object.values(formErrors)[0];
    Alert.alert('Check fields', (first?.message as string | undefined) ?? 'Please complete the form');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>Contact Admin</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.notice, { backgroundColor: colors.glass1, borderColor: colors.border1 }]}>
            <MaterialCommunityIcons name="shield-account-outline" size={20} color={colors.gold} />
            <Text style={[styles.noticeText, { color: colors.text2 }]}>
              Your message goes to the family fund admin. Use this for approval requests,
              payment verification questions, or anything else you need help with.
            </Text>
          </View>

          <Controller
            control={control}
            name="subject"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Subject"
                value={value}
                onChangeText={onChange}
                placeholder="e.g. Account approval"
                error={errors.subject?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="body"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Message"
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={6}
                placeholder="Describe your issue or question..."
                error={errors.body?.message}
              />
            )}
          />

          <View style={styles.btnRow}>
            <Button label="Cancel" onPress={() => router.back()} variant="ghost" style={styles.btn} />
            <Button
              label={sending ? 'Sending…' : 'Send to Admin'}
              onPress={handleSubmit(onSubmit, onInvalid)}
              loading={sending}
              disabled={sending}
              variant="solid"
              style={styles.btn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  noticeText: { flex: 1, fontSize: 12.5, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  btn: { flex: 1 },
});

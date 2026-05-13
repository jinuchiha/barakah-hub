import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { changePassword } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((v) => v.newPassword === v.confirmPassword, {
  message: 'New password and confirmation do not match',
  path: ['confirmPassword'],
}).refine((v) => v.currentPassword !== v.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

type FormData = z.infer<typeof schema>;

/**
 * Change Password screen. Hits Better-Auth's /api/auth/change-password
 * which validates the current password server-side and bcrypt-hashes
 * the new one. The "Sign out other devices" switch revokes other
 * active sessions — recommended when the user suspects their password
 * was leaked elsewhere.
 */
export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [saving, setSaving] = useState(false);
  const [revokeOthers, setRevokeOthers] = useState(true);

  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: revokeOthers,
      });
      reset();
      Alert.alert(
        'Password changed',
        revokeOthers
          ? 'Your password has been updated. Other devices have been signed out.'
          : 'Your password has been updated.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Unknown error';
      // Better-Auth surfaces "Invalid password" when current password
      // is wrong; rephrase for the user.
      const friendly = /invalid|incorrect/i.test(raw)
        ? 'Current password is incorrect'
        : raw;
      Alert.alert('Could not change password', friendly);
    } finally {
      setSaving(false);
    }
  };

  const onInvalid = (formErrors: FieldErrors<FormData>) => {
    const first = Object.values(formErrors)[0];
    Alert.alert('Check fields', (first?.message as string | undefined) ?? 'Please correct the highlighted fields');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text1} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>Change Password</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.notice, { backgroundColor: colors.glass1, borderColor: colors.border1 }]}>
            <MaterialCommunityIcons name="shield-key-outline" size={18} color={colors.gold} />
            <Text style={[styles.noticeText, { color: colors.text2 }]}>
              Use a strong password — at least 8 characters with a mix of letters and numbers.
            </Text>
          </View>

          <Controller
            control={control}
            name="currentPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Current Password"
                value={value}
                onChangeText={onChange}
                isPassword
                error={errors.currentPassword?.message}
                autoCapitalize="none"
                autoComplete="current-password"
              />
            )}
          />

          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                label="New Password"
                value={value}
                onChangeText={onChange}
                isPassword
                error={errors.newPassword?.message}
                autoCapitalize="none"
                autoComplete="new-password"
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Confirm New Password"
                value={value}
                onChangeText={onChange}
                isPassword
                error={errors.confirmPassword?.message}
                autoCapitalize="none"
                autoComplete="new-password"
              />
            )}
          />

          <View style={[styles.toggleRow, { borderColor: colors.border1 }]}>
            <View style={styles.toggleText}>
              <Text style={[styles.toggleLabel, { color: colors.text1 }]}>Sign out other devices</Text>
              <Text style={[styles.toggleHint, { color: colors.text3 }]}>
                Recommended — kicks out anyone using your old password elsewhere
              </Text>
            </View>
            <Switch
              value={revokeOthers}
              onValueChange={setRevokeOthers}
              trackColor={{ false: colors.bg4, true: colors.primaryDim }}
              thumbColor={colors.primary}
            />
          </View>

          <View style={styles.btnRow}>
            <Button label="Cancel" onPress={() => router.back()} variant="ghost" style={styles.btn} />
            <Button
              label={saving ? 'Updating…' : 'Update Password'}
              onPress={handleSubmit(onSubmit, onInvalid)}
              loading={saving}
              disabled={saving}
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
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  noticeText: { flex: 1, fontSize: 12.5, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: 13.5, fontFamily: 'Inter_600SemiBold' },
  toggleHint: { fontSize: 11.5, fontFamily: 'Inter_400Regular', marginTop: 2, lineHeight: 16 },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  btn: { flex: 1 },
});

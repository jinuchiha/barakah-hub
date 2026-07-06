import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useAuthStore } from '@/stores/auth.store';
import { updateProfile } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';
import { spacing } from '@/lib/theme';

const schema = z.object({
  phone: z.string().max(30).optional().or(z.literal('')),
  city: z.string().max(60).optional().or(z.literal('')),
  province: z.string().max(40).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

/**
 * Edit Profile screen.
 *
 * Optimistically updates the auth store so the rest of the app (sidebar
 * name, header, prayer times city) reflects the change immediately. On
 * a server error we restore the previous user object.
 */
export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      phone: user?.phone ?? '',
      city: user?.city ?? '',
      province: user?.province ?? '',
    },
  });

  if (!user) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]}>
        <Text style={[styles.empty, { color: colors.text3 }]}>Not signed in</Text>
      </SafeAreaView>
    );
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const previous = user;
    try {
      const updated = await updateProfile({
        phone: data.phone || null,
        city: data.city || null,
        province: data.province || null,
      });
      setUser({ ...previous, ...updated });
      Alert.alert(t('editProfile.saved'), t('editProfile.profileUpdated'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      setUser(previous);
      Alert.alert(t('editProfile.failedToSave'), err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUploaded = async (url: string) => {
    const previous = user;
    setUser({ ...previous, photoUrl: url });
    try {
      await updateProfile({ photoUrl: url });
    } catch (err) {
      setUser(previous);
      Alert.alert('Photo not saved', err instanceof Error ? err.message : 'Could not save photo');
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
        <Text style={[styles.headerTitle, { color: colors.text1 }]}>{t('editProfile.title')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.avatarSection}>
            <AvatarUpload
              name={user.nameEn || user.nameUr}
              color={user.color}
              currentUrl={user.photoUrl}
              onUploadComplete={handleAvatarUploaded}
            />
            <Text style={[styles.avatarHint, { color: colors.text4 }]}>{t('editProfile.tapAvatarHint')}</Text>
          </View>

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('editProfile.phone')}
                value={value ?? ''}
                onChangeText={onChange}
                keyboardType="phone-pad"
                error={errors.phone?.message}
                placeholder="+92 300 1234567"
              />
            )}
          />

          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, value } }) => (
              <Input
                label="City"
                value={value ?? ''}
                onChangeText={onChange}
                error={errors.city?.message}
                placeholder="e.g. Karachi"
                autoCapitalize="words"
              />
            )}
          />

          <Controller
            control={control}
            name="province"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('editProfile.province')}
                value={value ?? ''}
                onChangeText={onChange}
                error={errors.province?.message}
                placeholder="e.g. Sindh"
                autoCapitalize="words"
              />
            )}
          />

          <View style={styles.btnRow}>
            <Button label={t('common.cancel')} onPress={() => router.back()} variant="ghost" style={styles.btn} />
            <Button
              label={saving ? t('editProfile.saving') : t('editProfile.saveChanges')}
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  avatarHint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  btn: { flex: 1 },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 40 },
});

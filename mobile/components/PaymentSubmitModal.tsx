import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { radius, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { currentMonthLabel } from '@/lib/format';
import { pickImageWithChoice } from '@/lib/camera';
import { useConfig } from '@/hooks/useConfig';
import { api } from '@/lib/api';

type Colors = ReturnType<typeof useTheme>['colors'];

// Members self-submit Sadaqah/Zakat only — qarz is disbursed by admins,
// never self-credited (mirrors the server-side restriction).
const schema = z.object({
  amount: z.coerce.number().int().positive('Amount must be positive').max(10_000_000),
  pool: z.enum(['sadaqah', 'zakat']),
  monthLabel: z.string().min(3),
  note: z.string().max(200).optional(),
});

type FormData = z.infer<typeof schema>;

interface PaymentSubmitModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: FormData & { receiptUrl?: string }) => Promise<void>;
}

const pools = [
  { value: 'sadaqah' as const, label: 'Sadaqah' },
  { value: 'zakat' as const, label: 'Zakat' },
];

export function PaymentSubmitModal({ visible, onClose, onSubmit }: PaymentSubmitModalProps) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { data: config } = useConfig();
  const [screenshotUri, setScreenshotUri] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { amount: undefined, pool: 'sadaqah', monthLabel: currentMonthLabel(), note: '' },
  });

  /** Upload selected screenshot to /api/payments/upload-receipt, returns receipt URL. */
  async function uploadReceiptIfPresent(): Promise<string | undefined> {
    if (!screenshotUri) return undefined;
    try {
      const form = new FormData();
      const ext = screenshotUri.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
      // React Native FormData accepts { uri, name, type } objects even though
      // the lib.dom typing only knows Blob | string. Cast to bypass.
      form.append('receipt', {
        uri: screenshotUri,
        name: `receipt.${ext}`,
        type: ext === 'png' ? 'image/png' : 'image/jpeg',
      } as unknown as Blob);
      const { data } = await api.post<{ url: string }>('/api/payments/upload-receipt', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.url;
    } catch {
      // Receipt is optional — if the upload fails (e.g. storage not yet
      // configured) we submit the payment without it rather than blocking
      // the donation with an error popup. Admin can request the slip later.
      return undefined;
    }
  }

  const pickImage = async () => {
    const picked = await pickImageWithChoice();
    if (picked) setScreenshotUri(picked.uri);
  };

  const handleFormSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const receiptUrl = await uploadReceiptIfPresent();
      await onSubmit({ ...data, receiptUrl });
      // Reset form state before closing — onSubmit already handles close + success
      reset({ amount: undefined, pool: 'sadaqah', monthLabel: currentMonthLabel(), note: '' });
      setScreenshotUri(undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      Alert.alert('Submission failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // If react-hook-form validation fails, show the first error as an Alert so
  // the user can see what's wrong even if they missed the inline red text.
  const handleInvalid = (formErrors: FieldErrors<FormData>) => {
    const first = Object.values(formErrors)[0];
    const msg = (first?.message as string | undefined) ?? 'Please fill all required fields correctly';
    Alert.alert('Form incomplete', msg);
  };

  // Cancel should also clear typed amount, note, and attached screenshot so
  // a future submit doesn't auto-include them.
  const handleCancel = () => {
    reset({ amount: undefined, pool: 'sadaqah', monthLabel: currentMonthLabel(), note: '' });
    setScreenshotUri(undefined);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Submit Payment</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* EasyPaisa instructions — shown when supervisor has set their number */}
            {config?.easyPaiseNumber ? (
              <View style={[styles.easyPaiseBox, { borderColor: colors.primary, backgroundColor: colors.primaryDim }]}>
                <Text style={[styles.easyPaiseTitle, { color: colors.primary }]}>📱 Send via EasyPaisa First</Text>
                <Text style={[styles.easyPaiseName, { color: colors.text1 }]}>
                  {config.easyPaiseName ? `${config.easyPaiseName} — ` : ''}
                  <Text style={{ fontFamily: 'SpaceMono_400Regular', fontWeight: '700' }}>{config.easyPaiseNumber}</Text>
                </Text>
                <Text style={[styles.easyPaiseHint, { color: colors.text3 }]}>
                  Pehle is number pe paisa bhejein, phir neeche receipt upload karein.
                </Text>
              </View>
            ) : null}
            <Controller
              control={control}
              name="amount"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Amount (PKR)"
                  value={value?.toString() ?? ''}
                  onChangeText={(t) => onChange(t)}
                  keyboardType="numeric"
                  error={errors.amount?.message}
                />
              )}
            />

            <Text style={styles.fieldLabel}>Fund Pool</Text>
            <Controller
              control={control}
              name="pool"
              render={({ field: { onChange, value } }) => (
                <View style={styles.poolRow}>
                  {pools.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.poolChip, value === p.value && styles.poolChipActive]}
                      onPress={() => onChange(p.value)}
                    >
                      <Text style={[styles.poolChipText, value === p.value && styles.poolChipTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />

            <Controller
              control={control}
              name="monthLabel"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Month"
                  value={value}
                  onChangeText={onChange}
                  error={errors.monthLabel?.message}
                  placeholder="e.g. May 2026"
                />
              )}
            />

            <Controller
              control={control}
              name="note"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Note (optional)"
                  value={value ?? ''}
                  onChangeText={onChange}
                  multiline
                  numberOfLines={2}
                  error={errors.note?.message}
                />
              )}
            />

            <Text style={styles.fieldLabel}>Payment Screenshot (optional)</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
              {screenshotUri ? (
                <Image
                  source={{ uri: screenshotUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
              ) : (
                <>
                  <MaterialCommunityIcons name="camera-plus" size={28} color={colors.text3} />
                  <Text style={styles.uploadText}>Tap to upload</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.buttons}>
              <Button label="Cancel" onPress={handleCancel} variant="ghost" style={styles.btn} />
              <Button
                label={submitting ? 'Submitting…' : 'Submit'}
                onPress={handleSubmit(handleFormSubmit, handleInvalid)}
                loading={submitting}
                disabled={submitting}
                style={styles.btn}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg2,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
    borderWidth: 1,
    borderColor: colors.border1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text1,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text4,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  poolRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  poolChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border1,
    alignItems: 'center',
    backgroundColor: colors.glass2,
  },
  poolChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  poolChipText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text3,
  },
  poolChipTextActive: {
    color: colors.primary,
  },
  uploadBox: {
    height: 120,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
    backgroundColor: colors.glass1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  uploadText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.text3,
    marginTop: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: { flex: 1 },
  easyPaiseBox: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  easyPaiseTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 4 },
  easyPaiseName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  easyPaiseHint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
});

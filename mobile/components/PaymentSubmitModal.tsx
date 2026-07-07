import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, Alert, Platform, KeyboardAvoidingView, TextInput, ActivityIndicator,
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
import { api } from '@/lib/api';

type Colors = ReturnType<typeof useTheme>['colors'];

// Members self-submit Sadaqah/Zakat only — qarz is disbursed by admins,
// never self-credited (mirrors the server-side restriction).
const schema = z.object({
  amount: z.coerce.number().int().min(1, 'Please enter a valid amount').max(10_000_000, 'Amount too large'),
  pool: z.enum(['sadaqah', 'zakat']),
  monthLabel: z.string().min(3),
  note: z.string().max(200).optional(),
});

type FormData = z.infer<typeof schema>;

interface PaymentSubmitModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: FormData & { receiptUrl?: string }) => Promise<void>;
  easyPaiseNumber?: string;
  easyPaiseName?: string;
}

const pools = [
  { value: 'sadaqah' as const, label: 'Sadaqah' },
  { value: 'zakat' as const, label: 'Zakat' },
];

const STEP = 500;
const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export function PaymentSubmitModal({ visible, onClose, onSubmit, easyPaiseNumber, easyPaiseName }: PaymentSubmitModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [screenshotUri, setScreenshotUri] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [receiptUploadFailed, setReceiptUploadFailed] = useState(false);

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
      setReceiptUploadFailed(true);
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
      reset({ amount: undefined, pool: 'sadaqah', monthLabel: currentMonthLabel(), note: '' });
      setScreenshotUri(undefined);
      setReceiptUploadFailed(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      Alert.alert(t('pay.failed'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  // If react-hook-form validation fails, show the first error as an Alert so
  // the user can see what's wrong even if they missed the inline red text.
  const handleInvalid = (formErrors: FieldErrors<FormData>) => {
    const first = Object.values(formErrors)[0];
    const msg = (first?.message as string | undefined) ?? 'Please fill all required fields correctly';
    Alert.alert(t('pay.incomplete'), msg);
  };

  // Cancel should also clear typed amount, note, and attached screenshot so
  // a future submit doesn't auto-include them.
  const handleCancel = () => {
    reset({ amount: undefined, pool: 'sadaqah', monthLabel: currentMonthLabel(), note: '' });
    setScreenshotUri(undefined);
    setReceiptUploadFailed(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType={Platform.OS === 'android' ? 'none' : 'slide'} hardwareAccelerated onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {submitting ? (
            <View style={styles.submittingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.submittingText, { color: colors.text1 }]}>{t('pay.processing')}</Text>
            </View>
          ) : null}
          <View style={styles.handle} />
          <Text style={styles.title}>{t('pay.title')}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {easyPaiseNumber ? (
              <View style={[styles.easyPaiseBox, { borderColor: colors.primary, backgroundColor: colors.primaryDim }]}>
                <Text style={[styles.easyPaiseTitle, { color: colors.primary }]}>{t('pay.easyPaisaFirst')}</Text>
                <Text style={[styles.easyPaiseName, { color: colors.text1 }]}>
                  {easyPaiseName ? `${easyPaiseName} — ` : ''}
                  <Text style={{ fontFamily: 'SpaceMono_400Regular', fontWeight: '700' }}>{easyPaiseNumber}</Text>
                </Text>
                <Text style={[styles.easyPaiseHint, { color: colors.text3 }]}>
                  Pehle is number pe paisa bhejein, phir neeche receipt upload karein.
                </Text>
              </View>
            ) : null}
            <Controller
              control={control}
              name="amount"
              render={({ field: { onChange, value } }) => {
                const num = typeof value === 'number' ? value : 0;
                return (
                  <View style={styles.amountBlock}>
                    <Text style={styles.fieldLabel}>{t('pay.amountPkr')}</Text>
                    <View style={styles.presetsRow}>
                      {QUICK_AMOUNTS.map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          style={[
                            styles.presetChip,
                            { borderColor: num === amt ? colors.primary : colors.border1, backgroundColor: num === amt ? colors.primaryDim : colors.glass2 },
                          ]}
                          onPress={() => onChange(amt)}
                        >
                          <Text style={[styles.presetText, { color: num === amt ? colors.primary : colors.text3 }]}>
                            {amt >= 1000 ? `₨${amt / 1000}K` : `₨${amt}`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.stepperRow}>
                      <TouchableOpacity
                        style={[styles.stepBtn, { borderColor: colors.border1, backgroundColor: colors.glass2 }]}
                        onPress={() => onChange(Math.max(STEP, num - STEP))}
                        accessibilityLabel="Decrease amount"
                      >
                        <MaterialCommunityIcons name="minus" size={22} color={colors.text2} />
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.stepInput, { color: colors.text1, borderColor: colors.border1, backgroundColor: colors.glass1 }]}
                        value={value !== undefined ? String(value) : ''}
                        onChangeText={(t) => {
                          const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                          onChange(Number.isNaN(n) ? undefined : n);
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.text4}
                        returnKeyType="done"
                      />
                      <TouchableOpacity
                        style={[styles.stepBtn, { borderColor: colors.border1, backgroundColor: colors.glass2 }]}
                        onPress={() => onChange(num + STEP)}
                        accessibilityLabel="Increase amount"
                      >
                        <MaterialCommunityIcons name="plus" size={22} color={colors.text2} />
                      </TouchableOpacity>
                    </View>
                    {errors.amount ? <Text style={styles.errorText}>{errors.amount.message}</Text> : null}
                  </View>
                );
              }}
            />

            <Text style={styles.fieldLabel}>{t('pay.fundPool')}</Text>
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
                  label={t('pay.month')}
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
                  label={t('pay.noteOptional')}
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

            {receiptUploadFailed ? (
              <View style={[styles.uploadWarn, { backgroundColor: colors.goldDim, borderColor: colors.gold }]}>
                <MaterialCommunityIcons name="alert-outline" size={14} color={colors.gold} />
                <Text style={[styles.uploadWarnText, { color: colors.gold }]}>
                  Receipt upload failed — payment will be submitted without it. Admin may request the slip later.
                </Text>
              </View>
            ) : null}

            <View style={styles.buttons}>
              <Button label={t('common.cancel')} onPress={handleCancel} variant="ghost" style={styles.btn} />
              <Button
                label={submitting ? t('pay.submitting') : t('pay.submit')}
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
  amountBlock: { marginBottom: spacing.md },
  presetsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  presetChip: { flex: 1, paddingVertical: 10, borderRadius: radius.full, borderWidth: 1.5, alignItems: 'center' },
  presetText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: { width: 50, height: 50, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepInput: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, textAlign: 'center', fontSize: 22, fontFamily: 'SpaceMono_400Regular', paddingHorizontal: 8 },
  errorText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#dc5252', marginTop: 6 },
  uploadWarn: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm },
  uploadWarnText: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    zIndex: 20,
    gap: 14,
  },
  submittingText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});

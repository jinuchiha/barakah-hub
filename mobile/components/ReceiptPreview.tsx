import React, { memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import type { OcrResult } from '@/lib/ocr';
import { spacing, radius } from '@/lib/theme';

interface ReceiptPreviewProps {
  imageUri: string;
  ocr: OcrResult | null;
  loading: boolean;
  onRetake: () => void;
  onConfirm: (amount: number | null, date: string | null) => void;
}

export const ReceiptPreview = memo(function ReceiptPreview({
  imageUri,
  ocr,
  loading,
  onRetake,
  onConfirm,
}: ReceiptPreviewProps) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />

      {loading ? (
        <View style={[styles.ocrCard, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}>
          <MaterialCommunityIcons name="loading" size={20} color={colors.primary} />
          <Text style={[styles.ocrText, { color: colors.text2 }]}>Extracting receipt data...</Text>
        </View>
      ) : ocr ? (
        <View style={[styles.ocrCard, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}>
          <Text style={[styles.ocrTitle, { color: colors.text4 }]}>DETECTED</Text>
          {ocr.amount ? (
            <View style={styles.ocrRow}>
              <MaterialCommunityIcons name="cash" size={16} color={colors.primary} />
              <Text style={[styles.ocrValue, { color: colors.text1 }]}>
                PKR {ocr.amount.toLocaleString()}
              </Text>
            </View>
          ) : null}
          {ocr.date ? (
            <View style={styles.ocrRow}>
              <MaterialCommunityIcons name="calendar" size={16} color={colors.gold} />
              <Text style={[styles.ocrValue, { color: colors.text1 }]}>{ocr.date}</Text>
            </View>
          ) : null}
          {!ocr.amount && !ocr.date ? (
            <Text style={[styles.ocrText, { color: colors.text3 }]}>
              Could not extract data. Please fill manually.
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}
          onPress={onRetake}
        >
          <MaterialCommunityIcons name="camera-retake" size={18} color={colors.text2} />
          <Text style={[styles.btnText, { color: colors.text2 }]}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
          onPress={() => onConfirm(ocr?.amount ?? null, ocr?.date ?? null)}
        >
          <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
          <Text style={[styles.btnText, { color: colors.primary }]}>Use This</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  image: {
    width: '100%',
    height: 260,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  ocrCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 8,
    marginBottom: spacing.md,
  },
  ocrTitle: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
  },
  ocrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ocrValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  ocrText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  btnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});

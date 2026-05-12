import React, { memo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { captureImageWithCamera, pickImageFromGallery, type PickedImage } from '@/lib/camera';
import { spacing, radius } from '@/lib/theme';

interface ReceiptCameraProps {
  visible: boolean;
  onCapture: (image: PickedImage) => void;
  onClose: () => void;
}

export const ReceiptCamera = memo(function ReceiptCamera({
  visible,
  onCapture,
  onClose,
}: ReceiptCameraProps) {
  const { colors } = useTheme();

  const handleCamera = useCallback(async () => {
    const image = await captureImageWithCamera();
    if (image) {
      onCapture(image);
      onClose();
    }
  }, [onCapture, onClose]);

  const handleGallery = useCallback(async () => {
    const image = await pickImageFromGallery();
    if (image) {
      onCapture(image);
      onClose();
    }
  }, [onCapture, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.bg2, borderColor: colors.border2 }]}>
          <View style={[styles.handle, { backgroundColor: colors.border2 }]} />

          <Text style={[styles.title, { color: colors.text1 }]}>Scan Receipt</Text>
          <Text style={[styles.subtitle, { color: colors.text3 }]}>
            We'll extract the amount and date automatically
          </Text>

          <TouchableOpacity
            style={[styles.option, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}
            onPress={handleCamera}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryDim }]}>
              <MaterialCommunityIcons name="camera" size={24} color={colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: colors.text1 }]}>Take Photo</Text>
              <Text style={[styles.optionSub, { color: colors.text3 }]}>
                Align receipt within the frame
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text4} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}
            onPress={handleGallery}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.accentDim }]}>
              <MaterialCommunityIcons name="image-multiple" size={24} color={colors.accent} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: colors.text1 }]}>Choose from Gallery</Text>
              <Text style={[styles.optionSub, { color: colors.text3 }]}>
                Select an existing receipt photo
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text4} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.text3 }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  optionSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});

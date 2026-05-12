import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/useTheme';
import { getBiometricCapability, getBiometricLabel, authenticateWithBiometric } from '@/lib/biometric';
import { setBiometricEnabled } from '@/lib/security';
import { spacing, radius } from '@/lib/theme';
import { Button } from '@/components/ui/Button';

export default function BiometricSetupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [label, setLabel] = useState('Biometric');
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [iconName, setIconName] = useState<'fingerprint' | 'face-recognition'>('fingerprint');

  useEffect(() => {
    void loadCapability();
  }, []);

  async function loadCapability() {
    const cap = await getBiometricCapability();
    setAvailable(cap.available && cap.enrolled);
    setLabel(getBiometricLabel(cap.types));
    if (cap.types.includes('face')) setIconName('face-recognition');
  }

  const handleEnable = async () => {
    setLoading(true);
    try {
      const success = await authenticateWithBiometric(`Enable ${label} unlock`);
      if (success) {
        await setBiometricEnabled(true);
        router.replace('/(tabs)/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)/');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg0 }]}>
      <LinearGradient
        colors={[colors.bg0, colors.bg1]}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View entering={FadeInDown.duration(500)} style={styles.container}>
        <View style={[styles.iconRing, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}>
          <MaterialCommunityIcons name={iconName} size={64} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text1 }]}>
          Enable {label}?
        </Text>
        <Text style={[styles.body, { color: colors.text3 }]}>
          Sign in faster and more securely using {label}.
          Your biometric data never leaves your device.
        </Text>

        {available ? (
          <Button
            label={`Enable ${label}`}
            onPress={handleEnable}
            variant="primary"
            fullWidth
            loading={loading}
          />
        ) : (
          <View style={[styles.unavailableCard, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}>
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.text4} />
            <Text style={[styles.unavailableText, { color: colors.text3 }]}>
              Biometric authentication is not available or not enrolled on this device.
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.text3 }]}>Skip for now</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  iconRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  unavailableCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  unavailableText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  skipBtn: { paddingVertical: spacing.sm },
  skipText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});

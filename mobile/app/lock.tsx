import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/useTheme';
import { authenticateWithBiometric, getBiometricCapability, getBiometricLabel } from '@/lib/biometric';
import { isBiometricEnabled } from '@/lib/security';
import { verifyPin, getPinAttempts } from '@/lib/pin';
import { useAuth } from '@/hooks/useAuth';
import { spacing, radius } from '@/lib/theme';

type LockView = 'biometric' | 'pin';

function PinDot({ filled, color }: { filled: boolean; color: string }) {
  return (
    <View style={[
      styles.pinDot,
      { borderColor: color, backgroundColor: filled ? color : 'transparent' },
    ]} />
  );
}

export default function LockScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { logout } = useAuth();
  const [view, setView] = useState<LockView>('biometric');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const shakeX = useSharedValue(0);

  useEffect(() => {
    void initLock();
  }, []);

  async function initLock() {
    const biometric = await isBiometricEnabled();
    if (!biometric) {
      setView('pin');
      return;
    }
    const cap = await getBiometricCapability();
    setBiometricLabel(getBiometricLabel(cap.types));
    await attemptBiometric();
  }

  const attemptBiometric = useCallback(async () => {
    const success = await authenticateWithBiometric('Unlock Barakah Hub');
    if (success) {
      router.replace('/(tabs)/');
    }
  }, [router]);

  const shake = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeX]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handleDigit = useCallback(async (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setPinError('');

    if (next.length === 4) {
      const result = await verifyPin(next);
      setPin('');
      if (result === 'ok') {
        router.replace('/(tabs)/');
      } else if (result === 'locked') {
        Alert.alert(
          'Too Many Attempts',
          'You have been locked out. Please sign in again.',
          [{
            text: 'Sign In',
            onPress: () => { void logout(); router.replace('/(auth)/login'); },
          }],
        );
      } else {
        const attempts = await getPinAttempts();
        setPinError(`Incorrect PIN. ${3 - attempts} attempt${3 - attempts !== 1 ? 's' : ''} remaining.`);
        shake();
      }
    }
  }, [pin, router, logout, shake]);

  const handleDelete = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg0 }]}>
      <LinearGradient
        colors={[colors.bg0, colors.bg1]}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
        <MaterialCommunityIcons name="shield-lock-outline" size={48} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text1 }]}>Barakah Hub</Text>
        <Text style={[styles.subtitle, { color: colors.text3 }]}>
          {view === 'biometric' ? 'Use biometric to unlock' : 'Enter your PIN'}
        </Text>

        {view === 'pin' && (
          <>
            <Animated.View style={[styles.dotsRow, shakeStyle]}>
              {[0, 1, 2, 3].map((i) => (
                <PinDot key={i} filled={i < pin.length} color={colors.primary} />
              ))}
            </Animated.View>

            {pinError ? (
              <Text style={[styles.error, { color: colors.danger }]}>{pinError}</Text>
            ) : null}

            <View style={styles.numpad}>
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.numKey, { backgroundColor: key ? colors.glass2 : 'transparent', borderColor: key ? colors.border1 : 'transparent' }]}
                  onPress={() => {
                    if (key === '⌫') handleDelete();
                    else if (key) void handleDigit(key);
                  }}
                  disabled={!key}
                  activeOpacity={key ? 0.7 : 1}
                >
                  <Text style={[styles.numText, { color: key === '⌫' ? colors.danger : colors.text1 }]}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setView('biometric')}
              style={styles.switchBtn}
            >
              <Text style={[styles.switchText, { color: colors.text3 }]}>
                Use {biometricLabel} instead
              </Text>
            </TouchableOpacity>
          </>
        )}

        {view === 'biometric' && (
          <View style={styles.biometricActions}>
            <TouchableOpacity
              style={[styles.biometricBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
              onPress={attemptBiometric}
            >
              <MaterialCommunityIcons name="fingerprint" size={32} color={colors.primary} />
              <Text style={[styles.biometricText, { color: colors.primary }]}>
                {biometricLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setView('pin')} style={styles.switchBtn}>
              <Text style={[styles.switchText, { color: colors.text3 }]}>Use PIN instead</Text>
            </TouchableOpacity>
          </View>
        )}
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
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: spacing.md,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  error: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    gap: 12,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  numKey: {
    width: 80,
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
  },
  biometricActions: {
    alignItems: 'center',
    gap: spacing.md,
  },
  biometricBtn: {
    width: 120,
    height: 120,
    borderRadius: radius.xxl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  biometricText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  switchBtn: {
    paddingVertical: spacing.sm,
  },
  switchText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});

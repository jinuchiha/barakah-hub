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
import { isPinEnabled, verifyPin, getPinAttempts, resetPinAttempts, getPinLockoutSeconds, MAX_ATTEMPTS_BEFORE_LOCK } from '@/lib/pin';
import { markUnlocked } from '@/lib/lock-state';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [view, setView] = useState<LockView>('biometric');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [pinAvailable, setPinAvailable] = useState(false);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    void initLock();
  }, []);

  async function initLock() {
    const [pinEnabled, biometric] = await Promise.all([isPinEnabled(), isBiometricEnabled()]);
    if (!biometric && !pinEnabled) {
      // No lock method configured — bypass lock screen entirely
      markUnlocked();
      router.replace('/(tabs)' as any);
      return;
    }
    setBiometricAvailable(biometric);
    setPinAvailable(pinEnabled);
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
      // A successful unlock clears any stale PIN attempt counter — fumbled
      // taps must not accumulate across sessions toward a lockout.
      await resetPinAttempts().catch(() => undefined);
      markUnlocked();
      router.replace('/(tabs)' as any);
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
        markUnlocked();
        router.replace('/(tabs)' as any);
      } else if (result === 'not-set') {
        // Shouldn't be reachable now that the PIN view is hidden without a
        // PIN, but if it is: send the user back to biometric, don't punish.
        setPinError('');
        setView('biometric');
      } else if (result === 'locked') {
        // Timed backoff, not a dead end: waiting works, biometric works,
        // and signing in again always works.
        const seconds = await getPinLockoutSeconds();
        const minutes = Math.max(1, Math.ceil(seconds / 60));
        Alert.alert(
          t('auth.tooManyAttempts'),
          t('auth.lockedTemporarily', { minutes }),
          [
            { text: t('common.close'), style: 'cancel' },
            {
              text: t('auth.signIn'),
              onPress: () => { void logout(); router.replace('/(auth)/login'); },
            },
          ],
        );
      } else {
        const attempts = await getPinAttempts();
        const remaining = Math.max(0, MAX_ATTEMPTS_BEFORE_LOCK - attempts);
        setPinError(t('auth.incorrectPin', { count: remaining, plural: remaining !== 1 ? 's' : '' }));
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
        <Text style={[styles.title, { color: colors.text1 }]}>{t('appName')}</Text>
        <Text style={[styles.subtitle, { color: colors.text3 }]}>
          {view === 'biometric' ? t('auth.useBiometricToUnlock') : t('auth.enterYourPin')}
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
                  accessibilityLabel={key === '⌫' ? 'Delete' : key || undefined}
                  accessibilityRole={key ? 'button' : undefined}
                >
                  <Text style={[styles.numText, { color: key === '⌫' ? colors.danger : colors.text1 }]}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {biometricAvailable ? (
              <TouchableOpacity
                onPress={() => setView('biometric')}
                style={styles.switchBtn}
              >
                <Text style={[styles.switchText, { color: colors.text3 }]}>
                  {t('auth.useBiometricInstead', { label: biometricLabel })}
                </Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}

        {view === 'biometric' && (
          <View style={styles.biometricActions}>
            <TouchableOpacity
              style={[styles.biometricBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
              onPress={attemptBiometric}
              accessibilityLabel={biometricLabel}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="fingerprint" size={32} color={colors.primary} />
              <Text style={[styles.biometricText, { color: colors.primary }]}>
                {biometricLabel}
              </Text>
            </TouchableOpacity>
            {/* Offering a PIN entry when no PIN exists is a lockout trap. */}
            {pinAvailable && (
            <TouchableOpacity onPress={() => setView('pin')} style={styles.switchBtn}>
              <Text style={[styles.switchText, { color: colors.text3 }]}>{t('auth.usePinInstead')}</Text>
            </TouchableOpacity>
            )}
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

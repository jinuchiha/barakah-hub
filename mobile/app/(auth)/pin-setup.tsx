import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/useTheme';
import { setPin } from '@/lib/pin';
import { spacing, radius } from '@/lib/theme';

function PinDot({ filled, color }: { filled: boolean; color: string }) {
  return (
    <View style={[
      styles.dot,
      { borderColor: color, backgroundColor: filled ? color : 'transparent' },
    ]} />
  );
}

export default function PinSetupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');
  const shakeX = useSharedValue(0);

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
    if (current.length >= 4) return;
    const next = current + digit;
    setCurrent(next);
    setError('');

    if (next.length === 4) {
      if (step === 'create') {
        setFirstPin(next);
        setCurrent('');
        setStep('confirm');
      } else {
        if (next === firstPin) {
          await setPin(next);
          router.replace('/(auth)/biometric-setup');
        } else {
          setCurrent('');
          setError('PINs do not match. Try again.');
          shake();
        }
      }
    }
  }, [current, step, firstPin, router, shake]);

  const handleDelete = useCallback(() => {
    setCurrent((p) => p.slice(0, -1));
  }, []);

  const handleSkip = useCallback(() => {
    router.replace('/(tabs)/');
  }, [router]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg0 }]}>
      <LinearGradient colors={[colors.bg0, colors.bg1]} style={StyleSheet.absoluteFillObject} />
      <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
        <Text style={[styles.title, { color: colors.text1 }]}>
          {step === 'create' ? 'Create PIN' : 'Confirm PIN'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.text3 }]}>
          {step === 'create'
            ? 'Choose a 4-digit PIN for quick unlock'
            : 'Enter the same PIN again to confirm'}
        </Text>

        <Animated.View style={[styles.dotsRow, shakeStyle]}>
          {[0, 1, 2, 3].map((i) => (
            <PinDot key={i} filled={i < current.length} color={colors.primary} />
          ))}
        </Animated.View>

        {error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
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

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.text3 }]}>Skip PIN setup</Text>
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
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: spacing.md,
  },
  dot: {
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
  skipBtn: { paddingVertical: spacing.sm },
  skipText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});

import React, { useEffect } from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { duration } from '@/lib/motion';

const { height: H } = Dimensions.get('window');

/**
 * The web's post-login moment, mobile edition: an ink veil sweeps up,
 * a gold bloom breathes once behind السلام عليكم, then everything lifts
 * away as the dashboard reveals underneath. ~1.5s total.
 */
export function WelcomeWipe({ name, onDone }: { name?: string; onDone: () => void }) {
  const veil = useSharedValue(0);
  const text = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    veil.value = withTiming(1, { duration: duration.standard, easing: Easing.out(Easing.cubic) });
    text.value = withDelay(120, withSequence(
      withTiming(1, { duration: duration.emphasized, easing: Easing.out(Easing.cubic) }),
      withDelay(180, withTiming(2, { duration: duration.instant })),
    ));
    lift.value = withDelay(620, withTiming(1, { duration: duration.emphasized, easing: Easing.in(Easing.cubic) }));
    const id = setTimeout(onDone, 940);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const veilStyle = useAnimatedStyle(() => ({
    opacity: veil.value * (1 - lift.value),
    transform: [{ translateY: lift.value * -H * 0.25 }],
  }));
  const textStyle = useAnimatedStyle(() => {
    const p = Math.min(text.value, 1);
    return {
      opacity: p * (1 - lift.value),
      transform: [{ translateY: (1 - p) * 22 }, { scale: 0.94 + p * 0.06 }],
    };
  });
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: Math.min(text.value, 1) * 0.9 * (1 - lift.value),
    transform: [{ scale: 0.6 + Math.min(text.value, 1) * 0.55 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.root, veilStyle]} pointerEvents="none">
      <LinearGradient colors={['#04070c', '#0a0f1a', '#0d1525']} style={StyleSheet.absoluteFillObject} />
      <Animated.View style={[styles.bloom, bloomStyle]} />
      <Animated.View style={textStyle}>
        <Text style={styles.salam}>السلام عليكم</Text>
        {name ? <Text style={styles.name}>{name}</Text> : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 999, alignItems: 'center', justifyContent: 'center' },
  bloom: {
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
    backgroundColor: 'rgba(217,176,76,0.14)',
    shadowColor: '#d9b04c', shadowOpacity: 1, shadowRadius: 60, shadowOffset: { width: 0, height: 0 },
  },
  salam: {
    fontFamily: 'NotoNaskhArabic_600SemiBold',
    fontSize: 34, color: '#e8c563', textAlign: 'center',
    lineHeight: 54, writingDirection: 'rtl',
  },
  name: {
    marginTop: 2, fontSize: 15, color: 'rgba(236,235,230,0.75)',
    textAlign: 'center', fontFamily: 'Inter_600SemiBold',
  },
});

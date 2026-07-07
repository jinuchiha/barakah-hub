import React, { useEffect } from 'react';
import { Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { height: H } = Dimensions.get('window');

/**
 * The web's post-login moment, mobile edition: an ink veil sweeps up,
 * a gold bloom breathes once behind السلام علیکم, then everything lifts
 * away as the dashboard reveals underneath. ~1.5s total.
 */
export function WelcomeWipe({ name, onDone }: { name?: string; onDone: () => void }) {
  const veil = useSharedValue(0);
  const text = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    veil.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    text.value = withDelay(260, withSequence(
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
      withDelay(520, withTiming(2, { duration: 60 })),
    ));
    lift.value = withDelay(1250, withTiming(1, { duration: 420, easing: Easing.in(Easing.cubic) }));
    const id = setTimeout(onDone, 1700);
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
        <Text style={styles.salam}>السلام علیکم</Text>
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
    fontSize: 34, color: '#e8c563', textAlign: 'center',
    fontFamily: 'NotoNastaliqUrdu_600SemiBold', lineHeight: 72,
  },
  name: {
    marginTop: 2, fontSize: 15, color: 'rgba(236,235,230,0.75)',
    textAlign: 'center', fontFamily: 'Inter_600SemiBold',
  },
});

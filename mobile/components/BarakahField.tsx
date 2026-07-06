import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withDelay, withSequence, Easing, cancelAnimation,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

/** The same words that drift through the web's space scene. */
const WORDS = ['بركة', 'صدقة', 'رحمة', 'خير', 'إحسان'];
const STAR_COUNT = 26;

// Deterministic pseudo-random so the field looks the same every mount
// (and stays testable — no Math.random in render).
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function Star({ index }: { index: number }) {
  const opacity = useSharedValue(0.15 + seeded(index, 1) * 0.3);
  const drift = useSharedValue(0);

  const size = 1 + seeded(index, 2) * 2.2;
  const left = seeded(index, 3) * W;
  const top = seeded(index, 4) * H;
  const twinkleMs = 1800 + seeded(index, 5) * 2600;
  const driftMs = 14000 + seeded(index, 6) * 12000;

  useEffect(() => {
    opacity.value = withDelay(
      seeded(index, 7) * 2000,
      withRepeat(
        withSequence(
          withTiming(0.75, { duration: twinkleMs, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.15, { duration: twinkleMs, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, false,
      ),
    );
    drift.value = withRepeat(withTiming(1, { duration: driftMs, easing: Easing.linear }), -1, false);
    return () => { cancelAnimation(opacity); cancelAnimation(drift); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: drift.value * -30 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.star,
        { width: size, height: size, borderRadius: size / 2, left, top },
        style,
      ]}
    />
  );
}

function FloatingWord({ word, index }: { word: string; index: number }) {
  const t = useSharedValue(0);
  const left = 20 + seeded(index, 11) * (W - 100);
  const startTop = H * 0.35 + seeded(index, 12) * H * 0.5;
  const riseMs = 26000 + seeded(index, 13) * 14000;

  useEffect(() => {
    t.value = withDelay(
      index * 3500,
      withRepeat(withTiming(1, { duration: riseMs, easing: Easing.linear }), -1, false),
    );
    return () => { cancelAnimation(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    // Rise slowly; fade in over the first fifth, out over the last fifth —
    // the same breathing drift the web's word sprites have.
    transform: [{ translateY: -t.value * H * 0.55 }],
    opacity: t.value < 0.2 ? t.value * 0.9 : t.value > 0.8 ? (1 - t.value) * 0.9 : 0.18,
  }));

  return (
    <Animated.Text
      accessibilityElementsHidden
      style={[styles.word, { left, top: startTop }, style]}
    >
      {word}
    </Animated.Text>
  );
}

/**
 * Mobile edition of the web's "Barakah Field" space scene: twinkling
 * drifting stars, floating Arabic words, and a soft crescent glow.
 * Pure Reanimated views (UI-thread), disabled under reduced motion.
 */
export function BarakahField({ dimmed = false, showCrescent = false }: { dimmed?: boolean; showCrescent?: boolean }) {
  const [reduced, setReduced] = React.useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
  }, []);

  const stars = useMemo(() => Array.from({ length: STAR_COUNT }, (_, i) => i), []);

  if (reduced) return null;

  return (
    <View style={[StyleSheet.absoluteFillObject, dimmed && { opacity: 0.55 }]} pointerEvents="none">
      {stars.map((i) => <Star key={i} index={i} />)}
      {WORDS.map((w, i) => <FloatingWord key={w} word={w} index={i} />)}
      {/* Crescent glow — light, never geometry (rock problem, solved on web).
          Bite is opaque ink, so only render on the dark login backdrop. */}
      {showCrescent ? (
        <>
          <View style={styles.crescentGlow} />
          <View style={styles.crescentBite} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  star: { position: 'absolute', backgroundColor: '#e8e2d2' },
  word: {
    position: 'absolute',
    fontSize: 34,
    color: 'rgba(200,155,60,0.5)',
    fontWeight: '600',
  },
  crescentGlow: {
    position: 'absolute',
    top: H * 0.06,
    right: W * 0.08,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(217,176,76,0.16)',
    shadowColor: '#d9b04c', shadowOpacity: 0.9, shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 }, elevation: 0,
  },
  crescentBite: {
    position: 'absolute',
    top: H * 0.06 + 6,
    right: W * 0.08 + 22,
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: '#06090f',
  },
});

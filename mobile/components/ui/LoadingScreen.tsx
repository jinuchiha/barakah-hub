import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Mark } from './Mark';
import { useTheme } from '@/lib/useTheme';
import { loop } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function LoadingScreen() {
  // Falls back to dark before ThemeProvider mounts (root gate) — matches
  // the splash; inside the app it follows the active theme.
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    // A loading pulse is one of the three loops that survive review: it says
    // "still working" rather than decorating. It still stops for anyone who
    // has asked the system for less motion — they get the mark held steady,
    // which communicates the same thing.
    if (reduced) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: loop.shimmer / 2 }),
        withTiming(0.45, { duration: loop.shimmer / 2 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(opacity);
      opacity.value = 1;
    };
  }, [opacity, reduced]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={[styles.container, { backgroundColor: colors.bg0 }]} accessibilityLabel="Loading">
      <Animated.View style={animStyle}>
        {/* The brand mark itself, not an icon-font glyph that merely resembles it. */}
        <Mark size={56} color={colors.brandGold} />
      </Animated.View>
      <Text style={[styles.text, { color: colors.text2 }]}>Barakah</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    // Sentence case with slight negative tracking. The previous all-caps,
    // wide-tracked treatment reads as generic startup SaaS.
    letterSpacing: -0.2,
  },
});

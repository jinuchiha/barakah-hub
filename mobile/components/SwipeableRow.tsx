import React, { useCallback } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';

interface SwipeAction {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  style?: ViewStyle;
}

const THRESHOLD = 80;
const FULL_OPEN = 100;

export function SwipeableRow({ children, leftAction, rightAction, style }: SwipeableRowProps) {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);
  const hapticFired = useSharedValue(false);

  const fireHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-50, 50])
    .onUpdate((e) => {
      const max = leftAction && rightAction ? FULL_OPEN : leftAction ? FULL_OPEN : -FULL_OPEN;
      const min = leftAction && rightAction ? -FULL_OPEN : leftAction ? 0 : -FULL_OPEN;
      translateX.value = Math.max(min, Math.min(max, e.translationX));
      // Fire haptic at threshold
      const past = Math.abs(translateX.value) > THRESHOLD;
      if (past && !hapticFired.value) {
        hapticFired.value = true;
        runOnJS(fireHaptic)();
      }
      if (!past) hapticFired.value = false;
    })
    .onEnd(() => {
      if (translateX.value > THRESHOLD && leftAction) {
        runOnJS(leftAction.onPress)();
      } else if (translateX.value < -THRESHOLD && rightAction) {
        runOnJS(rightAction.onPress)();
      }
      translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, THRESHOLD], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(translateX.value, [0, FULL_OPEN], [0.8, 1], Extrapolation.CLAMP) }],
  }));

  const rightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(translateX.value, [-FULL_OPEN, 0], [1, 0.8], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={[styles.container, style]}>
      {/* Left action reveal */}
      {leftAction ? (
        <Animated.View style={[styles.actionLeft, { backgroundColor: leftAction.color }, leftStyle]}>
          <MaterialCommunityIcons name={leftAction.icon} size={22} color="#fff" />
          <Text style={styles.actionLabel}>{leftAction.label}</Text>
        </Animated.View>
      ) : null}

      {/* Right action reveal */}
      {rightAction ? (
        <Animated.View style={[styles.actionRight, { backgroundColor: rightAction.color }, rightStyle]}>
          <MaterialCommunityIcons name={rightAction.icon} size={22} color="#fff" />
          <Text style={styles.actionLabel}>{rightAction.label}</Text>
        </Animated.View>
      ) : null}

      {/* Row content */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.row, rowStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', overflow: 'hidden' },
  row: { zIndex: 2 },
  actionLeft: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: FULL_OPEN,
    alignItems: 'center', justifyContent: 'center', gap: 3, zIndex: 1,
  },
  actionRight: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: FULL_OPEN,
    alignItems: 'center', justifyContent: 'center', gap: 3, zIndex: 1,
  },
  actionLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#fff', letterSpacing: 0.5 },
});

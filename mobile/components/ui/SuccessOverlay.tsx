'use client';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { useTheme } from '@/lib/useTheme';

interface Props {
  visible: boolean;
  type?: 'success' | 'error';
  message?: string;
  onDone?: () => void;
  autoDismissMs?: number;
}

function CheckIcon({ color, size = 48 }: { color: string; size?: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(200, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, [progress]);
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={22} stroke={color} strokeWidth={2.5} fill="none" opacity={0.2} />
      <Polyline points="14,24 21,31 34,17" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ErrorIcon({ color, size = 48 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={22} stroke={color} strokeWidth={2.5} fill="none" opacity={0.2} />
      <Path d="M17,17 L31,31 M31,17 L17,31" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

export function SuccessOverlay({ visible, type = 'success', message, onDone, autoDismissMs = 1400 }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const color = type === 'success' ? colors.accent : colors.danger;

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 14, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 180 });
      if (onDone) {
        opacity.value = withSequence(
          withTiming(1, { duration: 180 }),
          withDelay(autoDismissMs - 300, withTiming(0, { duration: 300 })),
        );
        scale.value = withSequence(
          withSpring(1, { damping: 14, stiffness: 300 }),
          withDelay(autoDismissMs - 200, withTiming(0.85, { duration: 250, easing: Easing.in(Easing.ease) })),
        );
        setTimeout(() => runOnJS(onDone)(), autoDismissMs);
      }
    } else {
      scale.value = withTiming(0.8, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!visible && scale.value === 0) return null;

  return (
    <Modal transparent visible animationType="none">
      <Animated.View style={[styles.backdrop, overlayStyle]}>
        <Animated.View style={[styles.card, { backgroundColor: colors.bg2, borderColor: `${color}30` }, cardStyle]}>
          {type === 'success' ? <CheckIcon color={color} /> : <ErrorIcon color={color} />}
          {message ? (
            <Text style={[styles.msg, { color: colors.text1 }]}>{message}</Text>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  card: { width: 140, height: 140, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  msg: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center', paddingHorizontal: 16 },
});

import React, { useEffect } from 'react';
import { TextInput, type TextStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedProps, withTiming, Easing,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedNumberProps {
  value: number;
  /** Worklet-safe formatter — runs on the UI thread every frame. */
  format?: (v: number) => string;
  duration?: number;
  style?: StyleProp<TextStyle>;
}

function defaultFormat(v: number): string {
  'worklet';
  // Manual grouping — Intl/toLocaleString is unreliable inside worklets.
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Worklet "Rs 12,500" formatter for money count-ups. */
export function fmtRsWorklet(v: number): string {
  'worklet';
  return 'Rs ' + Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Count-up number, same feel as the web dashboard's live stats. Uses the
 * TextInput + animatedProps trick so digits tick on the UI thread with no
 * re-renders. Falls back to the plain value on first paint.
 */
export function AnimatedNumber({ value, format, duration = 1100, style }: AnimatedNumberProps) {
  const progress = useSharedValue(0);
  const fmt = format ?? defaultFormat;

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, duration, progress]);

  const animatedProps = useAnimatedProps(() => ({
    text: fmt(progress.value),
    defaultValue: fmt(progress.value),
  } as never));

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      style={[{ padding: 0, margin: 0 }, style]}
      animatedProps={animatedProps}
      accessible
      accessibilityLabel={fmt(value)}
    />
  );
}

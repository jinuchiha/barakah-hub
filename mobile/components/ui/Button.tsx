import React from 'react';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/useTheme';
import { radius } from '@/lib/theme';

export type ButtonVariant = 'primary' | 'solid' | 'ghost' | 'danger' | 'gold';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  // Legacy compat
  icon?: React.ReactNode;
}

const sizeMap: Record<Size, { height: number; px: number; fontSize: number }> = {
  sm: { height: 36, px: 16, fontSize: 13 },
  md: { height: 44, px: 20, fontSize: 15 },
  lg: { height: 52, px: 28, fontSize: 16 },
};

function getHaptic(variant: ButtonVariant) {
  if (variant === 'danger') return Haptics.ImpactFeedbackStyle.Heavy;
  if (variant === 'ghost') return Haptics.ImpactFeedbackStyle.Light;
  return Haptics.ImpactFeedbackStyle.Medium;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const sz = sizeMap[size];
  const isDisabled = disabled || loading;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    void Haptics.impactAsync(getHaptic(variant));
    onPress();
  };

  const containerStyle = buildContainerStyle(variant, colors, sz, fullWidth, isDisabled);
  const textStyle = buildTextStyle(variant, colors, sz);

  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={containerStyle}
      >
        {loading ? (
          <ActivityIndicator size="small" color={getSpinnerColor(variant, colors)} />
        ) : (
          <Text style={textStyle}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

type Colors = ReturnType<typeof useTheme>['colors'];

function buildContainerStyle(
  variant: ButtonVariant,
  colors: Colors,
  sz: { height: number; px: number },
  fullWidth: boolean,
  disabled: boolean,
): ViewStyle {
  const base: ViewStyle = {
    height: sz.height,
    paddingHorizontal: sz.px,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    opacity: disabled ? 0.45 : 1,
  };

  if (fullWidth) base.alignSelf = 'stretch';

  const variants: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: colors.primaryDim,
      borderWidth: 1.5,
      borderColor: colors.primary,
      shadowColor: colors.shadowGreen,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 6,
    },
    solid: {
      backgroundColor: colors.primary,
      shadowColor: colors.shadowGreen,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.8,
      shadowRadius: 12,
      elevation: 6,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.border2,
    },
    danger: {
      backgroundColor: colors.dangerDim,
      borderWidth: 1.5,
      borderColor: colors.danger,
    },
    gold: {
      backgroundColor: colors.goldDim,
      borderWidth: 1.5,
      borderColor: colors.gold,
    },
  };

  return { ...base, ...variants[variant] };
}

function buildTextStyle(
  variant: ButtonVariant,
  colors: Colors,
  sz: { fontSize: number },
): TextStyle {
  const base: TextStyle = {
    fontFamily: 'Inter_600SemiBold',
    fontSize: sz.fontSize,
  };
  const textColors: Record<ButtonVariant, string> = {
    primary: colors.primary,
    solid: colors.bg0,
    ghost: colors.text2,
    danger: colors.danger,
    gold: colors.gold,
  };
  return { ...base, color: textColors[variant] };
}

function getSpinnerColor(variant: ButtonVariant, colors: Colors): string {
  if (variant === 'solid') return colors.bg0;
  if (variant === 'danger') return colors.danger;
  if (variant === 'gold') return colors.gold;
  return colors.primary;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const styles = StyleSheet.create({});

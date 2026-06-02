import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { radius, spacing } from '@/lib/theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
  leftIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  rightIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onRightIconPress?: () => void;
}

function useFloatingLabel(hasValue: boolean) {
  const labelY = useSharedValue(hasValue ? -22 : 0);
  const labelScale = useSharedValue(hasValue ? 0.8 : 1);

  const animatedLabelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: labelY.value }, { scale: labelScale.value }],
  }));

  const onFocus = () => {
    labelY.value = withTiming(-22, { duration: 180 });
    labelScale.value = withTiming(0.8, { duration: 180 });
  };

  const onBlur = (val: string) => {
    if (!val) {
      labelY.value = withTiming(0, { duration: 180 });
      labelScale.value = withTiming(1, { duration: 180 });
    }
  };

  return { animatedLabelStyle, onFocus, onBlur };
}

function useShakeAnimation() {
  const translateX = useSharedValue(0);

  const shake = () => {
    translateX.value = withSequence(
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { shake, animStyle };
}

export function Input({
  label,
  error,
  containerStyle,
  isPassword = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  value,
  onChangeText,
  ...textInputProps
}: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const { animatedLabelStyle, onFocus, onBlur } = useFloatingLabel(!!(value && value.length > 0));
  const { shake, animStyle } = useShakeAnimation();

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border1;
  const shadowStyle = focused
    ? { shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8 }
    : {};

  React.useEffect(() => {
    if (error) shake();
  }, [error, shake]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.wrapper, { borderColor, backgroundColor: colors.bg4 }, shadowStyle, animStyle]}>
        {leftIcon ? (
          <MaterialCommunityIcons name={leftIcon} size={18} color={colors.text3} style={styles.leftIcon} />
        ) : null}
        <View style={styles.inputContainer}>
          <Animated.Text
            style={[
              styles.floatingLabel,
              { color: focused ? colors.primary : colors.text3, transformOrigin: 'left center' },
              animatedLabelStyle,
            ]}
            onPress={() => inputRef.current?.focus()}
          >
            {label}
          </Animated.Text>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text1 }]}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => { setFocused(true); onFocus(); }}
            onBlur={() => { setFocused(false); onBlur(value ?? ''); }}
            placeholderTextColor={colors.text4}
            secureTextEntry={isPassword && !showPassword}
            autoCapitalize={isPassword ? 'none' : textInputProps.autoCapitalize}
            autoCorrect={isPassword ? false : textInputProps.autoCorrect}
            {...textInputProps}
          />
        </View>
        {isPassword ? (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.text3} />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name={rightIcon} size={20} color={colors.text3} />
          </TouchableOpacity>
        ) : null}
      </Animated.View>
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingTop: 20,
    paddingBottom: 10,
    minHeight: 58,
  },
  leftIcon: {
    marginRight: spacing.sm,
    marginTop: -8,
  },
  inputContainer: {
    flex: 1,
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    zIndex: 1,
  },
  input: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    paddingTop: 4,
    paddingBottom: 0,
    minHeight: 28,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
    marginLeft: 4,
  },
});

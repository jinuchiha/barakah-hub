import React, { memo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { spacing } from '@/lib/theme';

const { width: SCREEN_W } = Dimensions.get('window');

export interface SlideData {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  bgGlow: string;
}

interface OnboardingSlideProps {
  slide: SlideData;
  index: number;
  scrollX: SharedValue<number>;
}

export const OnboardingSlide = memo(function OnboardingSlide({
  slide,
  index,
  scrollX,
}: OnboardingSlideProps) {
  const { colors } = useTheme();

  const animStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_W,
      index * SCREEN_W,
      (index + 1) * SCREEN_W,
    ];
    const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85]);
    const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4]);
    return { transform: [{ scale }], opacity };
  });

  return (
    <View style={[styles.slide, { width: SCREEN_W }]}>
      <Animated.View style={[styles.content, animStyle]}>
        <View style={[styles.iconContainer, { backgroundColor: `${slide.iconColor}20`, shadowColor: slide.iconColor }]}>
          <MaterialCommunityIcons name={slide.icon} size={72} color={slide.iconColor} />
        </View>
        <Text style={[styles.title, { color: colors.text1 }]}>{slide.title}</Text>
        <Text style={[styles.subtitle, { color: colors.text3 }]}>{slide.subtitle}</Text>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
});

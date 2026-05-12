import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { darkColors } from '@/lib/theme';

export function LoadingScreen() {
  const opacity = useSharedValue(0.4);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0.4, { duration: 800 })),
      -1,
      false,
    );
    scale.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 800 }), withTiming(0.9, { duration: 800 })),
      -1,
      false,
    );
  }, [opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={animStyle}>
        <MaterialCommunityIcons name="star-crescent" size={56} color={darkColors.primary} />
      </Animated.View>
      <Text style={styles.text}>Barakah Hub</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.bg0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    color: darkColors.text2,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

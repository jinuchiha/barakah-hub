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
import { useTheme } from '@/lib/useTheme';

export function LoadingScreen() {
  // Falls back to dark before ThemeProvider mounts (root gate) — matches
  // the splash; inside the app it follows the active theme.
  const { colors } = useTheme();
  const opacity = useSharedValue(0.4);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0.4, { duration: 800 })),
      -1, false,
    );
    scale.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 800 }), withTiming(0.9, { duration: 800 })),
      -1, false,
    );
    return () => { opacity.value = 0.4; scale.value = 0.9; };
  }, [opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.bg0 }]}>
      <Animated.View style={animStyle}>
        <MaterialCommunityIcons name="star-crescent" size={56} color={colors.primary} />
      </Animated.View>
      <Text style={[styles.text, { color: colors.text2 }]}>Barakah Hub</Text>
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
    
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

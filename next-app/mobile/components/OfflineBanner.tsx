import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '@/stores/app.store';
import { spacing } from '@/lib/theme';

export function OfflineBanner(): React.ReactElement | null {
  const { isNetworkConnected } = useAppStore();
  const translateY = useSharedValue(-50);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!isNetworkConnected) {
      translateY.value = withSpring(0, { damping: 14, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withTiming(-50, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isNetworkConnected, translateY, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.banner, animStyle]} pointerEvents="none">
      <View style={styles.inner}>
        <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" />
        <Text style={styles.text}>No Internet Connection</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  inner: {
    backgroundColor: '#ff5252',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});

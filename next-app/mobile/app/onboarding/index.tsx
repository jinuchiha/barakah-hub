import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OnboardingSlide, type SlideData } from '@/components/OnboardingSlide';
import { useTheme } from '@/lib/useTheme';
import { markOnboardingComplete } from '@/lib/onboarding';
import { spacing, radius } from '@/lib/theme';

const { width: W } = Dimensions.get('window');

const SLIDES: SlideData[] = [
  {
    icon: 'star-crescent',
    iconColor: '#ffd740',
    title: 'Welcome to\nBarakah Hub',
    subtitle: 'Your family\'s trusted fund management platform — built on trust, transparency, and community.',
    bgGlow: 'rgba(255,215,64,0.15)',
  },
  {
    icon: 'shield-lock-outline',
    iconColor: '#00e676',
    title: 'Private & Secure',
    subtitle: 'Your financial data is encrypted and only accessible to authorized family members. Face ID and PIN protection built in.',
    bgGlow: 'rgba(0,230,118,0.15)',
  },
  {
    icon: 'account-group-outline',
    iconColor: '#448aff',
    title: 'Family Fund\nTogether',
    subtitle: 'Pool monthly contributions, vote on emergency cases, and support each other through Sadaqah, Zakat, and Qarz.',
    bgGlow: 'rgba(68,138,255,0.15)',
  },
  {
    icon: 'rocket-launch-outline',
    iconColor: '#00e676',
    title: 'Get Started',
    subtitle: 'Sign in to your existing account or contact your family admin to get an invitation code.',
    bgGlow: 'rgba(0,230,118,0.15)',
  },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const handleNext = useCallback(async () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      scrollRef.current?.scrollTo({ x: next * W, animated: true });
    } else {
      await markOnboardingComplete();
      router.replace('/(auth)/login');
    }
  }, [currentIndex, router]);

  const handleSkip = useCallback(async () => {
    await markOnboardingComplete();
    router.replace('/(auth)/login');
  }, [router]);

  const dotStyle = useAnimatedStyle(() => {
    const width = interpolate(scrollX.value, [0, W], [24, 8]);
    return { width: withSpring(width) };
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg0 }]}>
      <LinearGradient
        colors={[colors.bg0, colors.bg1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.skipRow}>
        {currentIndex < SLIDES.length - 1 ? (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.text3 }]}>Skip</Text>
          </TouchableOpacity>
        ) : <View />}
        <Text style={[styles.counter, { color: colors.text4 }]}>
          {currentIndex + 1}/{SLIDES.length}
        </Text>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / W);
          setCurrentIndex(idx);
        }}
        style={styles.slides}
      >
        {SLIDES.map((slide, i) => (
          <OnboardingSlide
            key={i}
            slide={slide}
            index={i}
            scrollX={scrollX}
          />
        ))}
      </Animated.ScrollView>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const isActive = i === currentIndex;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? colors.primary : colors.border2,
                    width: isActive ? 24 : 8,
                  },
                ]}
              />
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextText, { color: colors.primary }]}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  skipBtn: { padding: spacing.sm },
  skipText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  counter: {
    fontSize: 12,
    fontFamily: 'SpaceMono_400Regular',
  },
  slides: { flex: 1 },
  bottom: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    height: 52,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});

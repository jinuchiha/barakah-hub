import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle, withTiming, runOnJS, cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { getDailyVerse, getVerseAt, verseCount } from '@/lib/quran';
import { spacing, radius } from '@/lib/theme';

const CYCLE_MS = 24_000;

/**
 * Living verse card: starts on today's verse, then gently cross-fades to
 * the next one every ~24s — the content breathes instead of sitting
 * static. A slim gold progress hairline shows the cycle.
 */
export const DailyVerseCard = memo(function DailyVerseCard() {
  const { colors } = useTheme();
  const [index, setIndex] = useState(() => getDailyVerse.index?.() ?? 0);
  const fade = useSharedValue(1);
  const progress = useSharedValue(0);
  // The withTiming completion callback runs as a WORKLET on the UI
  // thread — calling plain JS (verseCount, ref reads) in there crashes
  // release builds. Advance through an argument-less JS closure instead.
  const advance = () => setIndex((i) => (i + 1) % verseCount());

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: CYCLE_MS });
    const id = setInterval(() => {
      // fade out → swap verse → fade in
      fade.value = withTiming(0, { duration: 450 }, (done) => {
        'worklet';
        if (done) runOnJS(advance)();
      });
    }, CYCLE_MS);
    return () => { clearInterval(id); cancelAnimation(fade); cancelAnimation(progress); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 500 });
    progress.value = 0;
    progress.value = withTiming(1, { duration: CYCLE_MS });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const verse = getVerseAt(index);
  if (!verse) return null;

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.container}>
      <LinearGradient
        colors={[colors.goldDim, 'rgba(255,215,64,0.04)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.border, { borderColor: colors.border2 }]} />

      <Animated.View style={fadeStyle}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name={verse.type === 'hadith' ? 'book-open-variant' : 'star-crescent'}
            size={14}
            color={colors.goldMuted}
          />
          <Text style={[styles.typeLabel, { color: colors.goldMuted }]}>
            {verse.type === 'hadith' ? 'Hadith' : 'Quran Verse'}
          </Text>
          <Text style={[styles.reference, { color: colors.text4 }]}>{verse.reference}</Text>
        </View>

        <Text style={[styles.arabic, { color: colors.gold }]}>{verse.arabic}</Text>

        <Text style={[styles.english, { color: colors.text2 }]}>{verse.english}</Text>

        {verse.urdu ? (
          <Text style={[styles.urdu, { color: colors.text3 }]}>{verse.urdu}</Text>
        ) : null}
      </Animated.View>

      {/* cycle hairline */}
      <View style={[styles.track, { backgroundColor: 'rgba(217,176,76,0.12)' }]}>
        <Animated.View style={[styles.bar, { backgroundColor: colors.goldMuted }, barStyle]} />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  typeLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flex: 1,
  },
  reference: {
    fontSize: 11,
    fontFamily: 'SpaceMono_400Regular',
  },
  arabic: {
    fontFamily: 'NotoNaskhArabic_400Regular',
    fontSize: 20,
    textAlign: 'right',
    lineHeight: 38,
    writingDirection: 'rtl',
    marginBottom: spacing.sm,
  },
  english: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  urdu: {
    fontSize: 13,
    lineHeight: 30,
    fontFamily: 'NotoNastaliqUrdu_400Regular',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  track: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },
  bar: { height: 2 },
});

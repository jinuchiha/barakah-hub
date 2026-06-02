import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/useTheme';
import { getDailyVerse } from '@/lib/quran';
import { spacing, radius } from '@/lib/theme';

export const DailyVerseCard = memo(function DailyVerseCard() {
  const { colors } = useTheme();
  const verse = getDailyVerse();

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.container}>
      <LinearGradient
        colors={[colors.goldDim, 'rgba(255,215,64,0.04)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.border, { borderColor: colors.goldMuted }]} />

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
    fontSize: 20,
    textAlign: 'right',
    lineHeight: 36,
    fontFamily: 'Inter_400Regular',
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
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
  },
});

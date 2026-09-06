import type { TextStyle } from 'react-native';

export const textStyles = {
  displayXL: {
    fontSize: 36,
    lineHeight: 44,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  } as TextStyle,
  displayLG: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  } as TextStyle,
  displayMD: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: 'Inter_600SemiBold',
  } as TextStyle,
  headingLG: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: 'Inter_600SemiBold',
  } as TextStyle,
  headingMD: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter_600SemiBold',
  } as TextStyle,
  headingSM: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_600SemiBold',
  } as TextStyle,
  bodyLG: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Inter_400Regular',
  } as TextStyle,
  bodyMD: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  } as TextStyle,
  bodySM: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  } as TextStyle,
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
  } as TextStyle,
  mono: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'SpaceMono_400Regular',
  } as TextStyle,
  // Nastaliq needs generous line-height — glyphs stack diagonally.
  urduLG: {
    fontSize: 18,
    lineHeight: 40,
    fontFamily: 'NotoNastaliqUrdu_600SemiBold',
  } as TextStyle,
  urduMD: {
    fontSize: 15,
    lineHeight: 34,
    fontFamily: 'NotoNastaliqUrdu_400Regular',
  } as TextStyle,
  urduSM: {
    fontSize: 13,
    lineHeight: 28,
    fontFamily: 'NotoNastaliqUrdu_400Regular',
  } as TextStyle,
  label: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,

  /**
   * Money.
   *
   * A finance app reads as expensive largely because of how its figures are
   * set, and ours were being rendered as ordinary text. Three things matter:
   * tabular figures so digits hold their column, negative tracking so large
   * numbers stop looking gappy, and a currency symbol that steps back instead
   * of competing with the amount (see `MoneyText`).
   */
  moneyHero: {
    fontSize: 42,
    lineHeight: 50,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  moneyLG: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.7,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  moneyMD: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  moneySM: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
} as const;

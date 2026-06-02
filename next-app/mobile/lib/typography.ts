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
  label: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
} as const;

import React from 'react';
import { Text, StyleSheet, type TextStyle, type StyleProp } from 'react-native';
import { textStyles } from '@/lib/typography';
import { useTheme } from '@/lib/useTheme';

type MoneySize = 'hero' | 'lg' | 'md' | 'sm';

const SCALE: Record<MoneySize, TextStyle> = {
  hero: textStyles.moneyHero,
  lg: textStyles.moneyLG,
  md: textStyles.moneyMD,
  sm: textStyles.moneySM,
};

/**
 * An amount, set the way a financial product should set one.
 *
 * The currency mark is rendered smaller and quieter than the figure it labels.
 * Nobody reads "₨" — they read the number — so letting the symbol match the
 * amount's weight makes the amount look smaller than it is and the whole
 * screen look cheaper. Same reason bank statements set the symbol back.
 *
 * The figure itself uses tabular numerals, so amounts stacked in a list hold
 * their columns instead of shuffling as digits change.
 */
export function MoneyText({
  amount,
  size = 'md',
  color,
  style,
  numberOfLines,
}: {
  amount: number | null | undefined;
  size?: MoneySize;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { colors } = useTheme();
  const n = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  const scale = SCALE[size];
  const tone = color ?? colors.text1;

  return (
    <Text
      style={[scale, { color: tone }, style]}
      numberOfLines={numberOfLines}
      // Screen readers should hear the currency, not a bare number.
      accessibilityLabel={`${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })} rupees`}
    >
      <Text style={[styles.symbol, { fontSize: (scale.fontSize ?? 16) * 0.56, color: tone }]}>₨ </Text>
      {n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}
    </Text>
  );
}

const styles = StyleSheet.create({
  symbol: {
    fontFamily: 'Inter_600SemiBold',
    opacity: 0.55,
    letterSpacing: 0,
  },
});

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/useTheme';
import { radius } from '@/lib/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  elevated?: boolean;
  gradient?: [string, string];
  shimmer?: boolean;
}

/**
 * The app's surface primitive — v2.
 *
 * Designed Android-first: BlurView never renders there, so depth has to come
 * from light, not translucency. Three cues do the work:
 *   1. a diagonal two-stop face gradient (surfaceGradA→B) instead of a flat
 *      fill — the card reads as a lit panel;
 *   2. a 1px top sheen — the highlight every physically-lit surface has;
 *   3. real Android elevation (6 / 10) alongside the iOS shadow.
 */
export function GlassCard({ children, style, glowColor, elevated = false, gradient, shimmer = false }: GlassCardProps) {
  const { colors } = useTheme();

  const shadow: ViewStyle = elevated ? {
    shadowColor: glowColor ?? '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 18,
    elevation: 10,
  } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  };

  return (
    <View style={[styles.card, { borderColor: glowColor ? `${glowColor}38` : colors.border1 }, shadow, style as ViewStyle]}>
      <LinearGradient
        colors={[colors.surfaceGradA, colors.surfaceGradB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius.lg }]}
        pointerEvents="none"
      />
      {/* Ambient light falling on the upper face */}
      <LinearGradient
        colors={['rgba(255,255,255,0.055)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.55 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius.lg }]}
        pointerEvents="none"
      />
      {gradient ? <LinearGradient colors={gradient} style={[StyleSheet.absoluteFillObject, { borderRadius: radius.lg }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} /> : null}
      {/* Top sheen — the 1px light line that separates "surface" from "slab" */}
      <View style={[styles.sheen, { backgroundColor: glowColor ? `${glowColor}55` : colors.sheen }]} pointerEvents="none" />
      {shimmer ? (
        <LinearGradient colors={['transparent', `${colors.gold}38`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shimmerLine} pointerEvents="none" />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  sheen: { position: 'absolute', top: 0, left: 10, right: 10, height: StyleSheet.hairlineWidth * 2, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  shimmerLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 10 },
});

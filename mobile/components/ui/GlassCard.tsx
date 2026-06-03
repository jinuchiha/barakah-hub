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

export function GlassCard({ children, style, glowColor, elevated = false, gradient, shimmer = false }: GlassCardProps) {
  const { colors } = useTheme();

  const shadow: ViewStyle = elevated ? {
    shadowColor: glowColor ?? '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 3,
  } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  };

  return (
    <View style={[styles.card, { borderColor: glowColor ? `${glowColor}30` : colors.border1 }, shadow, style as ViewStyle]}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.bg1, borderRadius: radius.lg }]} />
      <LinearGradient colors={['rgba(255,255,255,0.04)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.6 }} style={[StyleSheet.absoluteFillObject, { borderRadius: radius.lg }]} pointerEvents="none" />
      {gradient ? <LinearGradient colors={gradient} style={[StyleSheet.absoluteFillObject, { borderRadius: radius.lg }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} /> : null}
      {shimmer ? (
        <LinearGradient colors={['transparent', 'rgba(200,155,60,0.22)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shimmer} pointerEvents="none" />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  shimmer: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 10 },
});

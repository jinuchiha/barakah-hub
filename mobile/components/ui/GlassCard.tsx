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
}

function GlowBorder({ color }: { color: string }) {
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { borderRadius: radius.xl, borderWidth: 1.5, borderColor: color },
      ]}
      pointerEvents="none"
    />
  );
}

export function GlassCard({
  children,
  style,
  glowColor,
  elevated = false,
  gradient,
}: GlassCardProps) {
  const { colors } = useTheme();

  const shadowStyle: ViewStyle = elevated
    ? {
        shadowColor: glowColor ?? colors.primaryGlow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 24,
        elevation: 12,
      }
    : {};

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.glass2, borderColor: glowColor ?? colors.glassBorder },
        shadowStyle,
        style,
      ]}
    >
      {gradient ? (
        <LinearGradient
          colors={gradient}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.00)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      )}
      {children}
      {glowColor ? <GlowBorder color={glowColor} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

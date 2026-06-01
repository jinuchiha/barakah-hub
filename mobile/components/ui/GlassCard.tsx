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

export function GlassCard({
  children,
  style,
  glowColor,
  elevated = false,
  gradient,
}: GlassCardProps) {
  const { colors } = useTheme();

  // Subtle depth on every card for a premium feel; deeper when elevated.
  const shadowStyle: ViewStyle = elevated
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
        elevation: 8,
      }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 3,
      };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.bg1, borderColor: glowColor ?? colors.border1 },
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
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

interface EmptyStateProps {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'inbox-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();

  const isLoading = icon === 'loading';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: colors.glass2, borderColor: colors.border1 },
        ]}
      >
        {isLoading ? (
          <Text style={[styles.crescent, { color: colors.primary }]}>☾</Text>
        ) : (
          <MaterialCommunityIcons name={icon} size={32} color={colors.primary} />
        )}
      </View>
      <Text style={[styles.title, { color: colors.text2 }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.text3 }]}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="primary" size="md" style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 220,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.xxl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  crescent: { fontSize: 30 },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: { marginTop: spacing.lg },
});

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Notification } from '@/types';
import { formatRelativeTime } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { useAuthStore } from '@/stores/auth.store';
import { spacing, radius } from '@/lib/theme';

const TYPE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  approved: 'check-circle',
  rejected: 'close-circle',
  msg: 'email',
  payment: 'cash-check',
  vote: 'vote',
  default: 'bell',
};

function getTypeColor(type: string, colors: ReturnType<typeof useTheme>['colors']) {
  if (type === 'approved' || type === 'payment') return colors.primary;
  if (type === 'rejected') return colors.danger;
  if (type === 'vote') return colors.gold;
  return colors.accent;
}

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
}

export function NotificationItem({ notification: n, onPress }: NotificationItemProps) {
  const { colors } = useTheme();
  const { language } = useAuthStore();
  const icon = TYPE_ICONS[n.type] ?? TYPE_ICONS.default ?? 'bell';
  const title = language === 'ur' ? n.titleUr : n.titleEn;
  const body = language === 'ur' ? n.ur : n.en;
  const iconColor = getTypeColor(n.type, colors);

  return (
    <Pressable
      style={[
        styles.item,
        { borderBottomColor: colors.border1 },
        !n.read && { backgroundColor: colors.primaryDim },
      ]}
      onPress={onPress}
    >
      {!n.read ? <View style={[styles.accentBar, { backgroundColor: colors.primary }]} /> : null}
      <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.content}>
        {title ? <Text style={[styles.title, { color: colors.text1 }]}>{title}</Text> : null}
        <Text style={[styles.body, { color: colors.text3 }]} numberOfLines={2}>{body}</Text>
        <Text style={[styles.time, { color: colors.text4 }]}>{formatRelativeTime(n.createdAt)}</Text>
      </View>
      {!n.read ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: radius.xs,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    marginLeft: spacing.sm,
    flexShrink: 0,
  },
});

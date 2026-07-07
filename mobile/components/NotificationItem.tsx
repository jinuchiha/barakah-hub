import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Notification } from '@/types';
import { formatRelativeTime } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { useAuthStore } from '@/stores/auth.store';
import { spacing, radius } from '@/lib/theme';

// Web emits hyphenated types (payment-pending, member-pending, vote-open…)
// so match on prefix, not exact keys.
function getTypeIcon(type: string): keyof typeof MaterialCommunityIcons.glyphMap {
  if (type.startsWith('payment')) return 'cash-check';
  if (type.startsWith('loan')) return 'hand-coin';
  if (type.startsWith('case') || type.startsWith('emergency')) return 'lifebuoy';
  if (type.startsWith('vote')) return 'vote';
  if (type.startsWith('member')) return 'account-clock';
  if (type.startsWith('pledge')) return 'calendar-clock';
  if (type === 'msg' || type === 'message') return 'email';
  if (type === 'approved') return 'check-circle';
  if (type === 'rejected') return 'close-circle';
  return 'bell';
}

function getTypeColor(type: string, colors: ReturnType<typeof useTheme>['colors']) {
  if (type === 'approved' || type.startsWith('payment')) return colors.primary;
  if (type === 'rejected' || type.startsWith('emergency')) return colors.danger;
  if (type.startsWith('vote')) return colors.gold;
  return colors.accent;
}

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
}

export function NotificationItem({ notification: n, onPress }: NotificationItemProps) {
  const { colors } = useTheme();
  const { language } = useAuthStore();
  const icon = getTypeIcon(n.type);
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
        {title ? <Text style={[styles.title, { color: colors.text1 }, language === 'ur' && styles.urduTitle]}>{title}</Text> : null}
        <Text style={[styles.body, { color: colors.text3 }, language === 'ur' && styles.urduBody]} numberOfLines={2}>{body}</Text>
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
  urduTitle: { fontFamily: 'NotoNastaliqUrdu_600SemiBold', fontSize: 13, lineHeight: 28 },
  urduBody: { fontFamily: 'NotoNastaliqUrdu_400Regular', fontSize: 12, lineHeight: 26 },
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

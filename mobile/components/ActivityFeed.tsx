import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatRelativeTime, formatPKR } from '@/lib/format';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

export interface ActivityItem {
  id: string;
  type: 'payment' | 'vote' | 'case' | 'loan' | 'member';
  title: string;
  subtitle?: string;
  amount?: number;
  timestamp: string;
}

const ACTIVITY_CONFIG = {
  payment: { icon: 'cash-check' as const,           color: '#2d8a5f' },
  vote:    { icon: 'vote' as const,                 color: '#c89b3c' },
  case:    { icon: 'alert-circle-outline' as const, color: '#dc5252' },
  loan:    { icon: 'handshake' as const,            color: '#608dd7' },
  member:  { icon: 'account-plus' as const,         color: '#8b6ec9' },
};

interface ActivityFeedProps {
  items: ActivityItem[];
}

function ActivityItemRow({
  item,
  isLast,
  index,
}: {
  item: ActivityItem;
  isLast: boolean;
  index: number;
}) {
  const { colors } = useTheme();
  const cfg = ACTIVITY_CONFIG[item.type];

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(index * 60)}
      style={styles.item}
    >
      <View style={styles.left}>
        <View style={[styles.iconCircle, { backgroundColor: `${cfg.color}20` }]}>
          <MaterialCommunityIcons name={cfg.icon} size={16} color={cfg.color} />
        </View>
        {!isLast ? <View style={[styles.line, { backgroundColor: colors.border1 }]} /> : null}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text1 }]}>{item.title}</Text>
        {item.subtitle ? (
          <Text style={[styles.subtitle, { color: colors.text3 }]}>{item.subtitle}</Text>
        ) : null}
        {item.amount ? (
          <Text style={[styles.amount, { color: cfg.color }]}>{formatPKR(item.amount)}</Text>
        ) : null}
        <Text style={[styles.time, { color: colors.text4 }]}>{formatRelativeTime(item.timestamp)}</Text>
      </View>
    </Animated.View>
  );
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  const { colors } = useTheme();

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.text4 }]}>No recent activity</Text>
      </View>
    );
  }

  return (
    <View>
      {items.map((item, idx) => (
        <ActivityItemRow key={item.id} item={item} isLast={idx === items.length - 1} index={idx} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  item: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  left: {
    alignItems: 'center',
    width: 36,
    marginRight: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    width: 1.5,
    marginTop: 4,
    minHeight: 12,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  amount: {
    fontSize: 13,
    fontFamily: 'SpaceMono_400Regular',
    fontWeight: '600',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  time: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 3,
  },
});

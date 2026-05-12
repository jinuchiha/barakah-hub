import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { NotificationItem } from '@/components/NotificationItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/lib/useTheme';
import { spacing } from '@/lib/theme';
import type { Notification } from '@/types';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, isLoading, refetch, isRefetching, markAllRead, isMarkingRead } = useNotifications();

  const unreadCount = data?.filter((n) => !n.read).length ?? 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg1 }]} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { borderBottomColor: colors.border1 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.glass2 }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text1} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text1 }]}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => markAllRead()} disabled={isMarkingRead} style={styles.markReadBtn}>
            <Text style={[styles.markReadText, { color: colors.primary }]}>Mark All Read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 90 }} />
        )}
      </Animated.View>

      {unreadCount > 0 ? (
        <Animated.View entering={FadeInDown.duration(300).delay(100)}
          style={[styles.unreadBanner, { backgroundColor: colors.primaryDim, borderBottomColor: colors.primary }]}
        >
          <MaterialCommunityIcons name="bell-ring-outline" size={16} color={colors.primary} />
          <Text style={[styles.unreadText, { color: colors.primary }]}>{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</Text>
        </Animated.View>
      ) : null}

      {isLoading ? (
        <EmptyState icon="loading" title="Loading notifications..." />
      ) : (
        <FlashList
          data={data ?? []}
          keyExtractor={(item: Notification) => item.id}
          renderItem={({ item }) => <NotificationItem notification={item} />}
          estimatedItemSize={80}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="bell-off-outline" title="No notifications" subtitle="You're all caught up!" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  markReadBtn: { alignItems: 'flex-end' },
  markReadText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    width: 90,
    textAlign: 'right',
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  unreadText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
});

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { NotificationItem } from '@/components/NotificationItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { BrandedEmptyState } from '@/components/ui/BrandedEmptyState';
import { useNotifications } from '@/hooks/useNotifications';
import { resolveRoute } from '@/lib/notifications-handler';
import { useTheme } from '@/lib/useTheme';
import { spacing } from '@/lib/theme';
import type { Notification } from '@/types';

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data, isLoading, isError, refetch, isRefetching, markAllRead, isMarkingRead, markOneRead } = useNotifications();

  const unreadCount = data?.filter((n) => !n.read).length ?? 0;

  // Tap = mark THAT notification read (badge drops) + jump to its screen.
  const openNotification = (n: Notification) => {
    if (!n.read) markOneRead(n.id);
    const route = resolveRoute({ type: n.type });
    if (route !== '/notifications') router.push(route as never);
  };

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
        <Text style={[styles.title, { color: colors.text1 }]}>{t('notifications.title')}</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => markAllRead()} disabled={isMarkingRead} style={styles.markReadBtn} accessibilityLabel={t('notifications.markAllRead')} accessibilityRole="button">
            <Text style={[styles.markReadText, { color: colors.primary }]}>{t('notifications.markAllRead')}</Text>
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

      {isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('common.error')}
          actionLabel={t('common.retry')}
          onAction={() => void refetch()}
        />
      ) : isLoading ? (
        <EmptyState icon="loading" title={t('common.loading')} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: Notification) => item.id}
          renderItem={({ item }) => <NotificationItem notification={item} onPress={() => openNotification(item)} />}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <BrandedEmptyState type="notifications" title={t('notifications.noNotifications')} subtitle="You're all caught up!" />
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

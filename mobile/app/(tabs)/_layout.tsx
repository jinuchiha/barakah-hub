import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { useAppStore } from '@/stores/app.store';
import { useTheme } from '@/lib/useTheme';
import { BottomNav, type TabRoute } from '@/components/BottomNav';
import { useRouter, usePathname } from 'expo-router';
import { useAppLock } from '@/hooks/useAppLock';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { canManageFunds } from '@/lib/roles';

function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { notificationCount } = useAppStore();
  const { user } = useAuthStore();

  const getActiveTab = (): TabRoute => {
    if (pathname.includes('/payments')) return 'payments';
    if (pathname.includes('/cases')) return 'cases';
    if (pathname.includes('/loans')) return 'loans';
    if (pathname.includes('/analytics')) return 'analytics';
    if (pathname.includes('/profile')) return 'profile';
    return 'index';
  };

  const activeTab = getActiveTab();

  const handleTabPress = useCallback((tab: TabRoute) => {
    const target = tab === 'index' ? '/(tabs)/' : `/(tabs)/${tab}`;
    if (activeTab === tab) {
      router.replace(target as never); // scroll to top / don't stack
    } else {
      router.push(target as never);
    }
  }, [activeTab, router]);

  return (
    <BottomNav
      activeTab={activeTab}
      onTabPress={handleTabPress}
      notificationCount={notificationCount}
      isAdmin={canManageFunds(user?.role)}
    />
  );
}

const renderTabBar = () => <CustomTabBar />;

export default function TabsLayout() {
  const { isAuthenticated } = useAuthStore();
  const { colors } = useTheme();
  const { ready } = useAppLock(isAuthenticated);

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!ready) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg1 }]}>
      <Tabs
        screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
        tabBar={renderTabBar}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="payments" />
        <Tabs.Screen name="cases" />
        <Tabs.Screen name="loans" />
        <Tabs.Screen name="analytics" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

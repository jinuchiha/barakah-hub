import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { useAppStore } from '@/stores/app.store';
import { useTheme } from '@/lib/useTheme';
import { BottomNav, type TabRoute } from '@/components/BottomNav';
import { useRouter, usePathname } from 'expo-router';

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

  const handleTabPress = (tab: TabRoute) => {
    if (tab === 'index') router.push('/(tabs)/');
    else router.push(`/(tabs)/${tab}`);
  };

  return (
    <BottomNav
      activeTab={getActiveTab()}
      onTabPress={handleTabPress}
      notificationCount={notificationCount}
      isAdmin={user?.role === 'admin'}
    />
  );
}

export default function TabsLayout() {
  const { isAuthenticated } = useAuthStore();
  const { colors } = useTheme();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg1 }]}>
      <Tabs
        screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
        tabBar={() => <CustomTabBar />}
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

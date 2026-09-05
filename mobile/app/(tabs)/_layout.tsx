import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { useAppStore } from '@/stores/app.store';
import { useTheme } from '@/lib/useTheme';
import { BottomNav, type TabRoute } from '@/components/BottomNav';
import { useRouter, usePathname } from 'expo-router';
import { useAppLock } from '@/hooks/useAppLock';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

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
    const routes: Record<string, string> = {
      index: '/(tabs)', payments: '/(tabs)/payments', cases: '/(tabs)/cases',
      loans: '/(tabs)/loans', analytics: '/(tabs)/analytics', profile: '/(tabs)/profile',
    };
    const target = routes[tab] ?? '/(tabs)';
    router.navigate(target as never);
  }, [router]);

  return (
    <BottomNav
      activeTab={activeTab}
      onTabPress={handleTabPress}
      notificationCount={notificationCount}
      // Analytics (the only adminOnly tab) walls out non-admins at
      // analytics.tsx — showing the tab to supervisors via canManageFunds
      // gave them a tab that only ever said "admin only, go back".
      isAdmin={user?.role === 'admin'}
    />
  );
}

const renderTabBar = () => <CustomTabBar />;

/** Honest waiting room — a pending/rejected member must never land on an
 * empty dashboard wondering what broke. */
function PendingGate({ status }: { status: string }) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const rejected = status === 'rejected';
  return (
    <View style={[styles.container, { backgroundColor: colors.bg0, alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
      <Text style={{ fontSize: 44, marginBottom: 14 }}>{rejected ? '🚫' : '⏳'}</Text>
      <Text style={{ color: colors.text1, fontSize: 19, fontFamily: 'Inter_700Bold', textAlign: 'center' }}>
        {rejected ? 'Application not approved' : 'Approval pending'}
      </Text>
      <Text style={{ color: colors.text3, fontSize: 14, fontFamily: 'NotoNastaliqUrdu_400Regular', lineHeight: 32, textAlign: 'center', marginTop: 10 }}>
        {rejected ? 'آپ کی درخواست منظور نہیں ہوئی · ایڈمن سے رابطہ کریں' : 'ایڈمن کی منظوری کا انتظار ہے · منظوری پر اطلاع ملے گی'}
      </Text>
      {user?.nameEn ? (
        <Text style={{ color: colors.text4, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 14 }}>{user.nameEn}</Text>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const { colors } = useTheme();
  const { ready } = useAppLock(isAuthenticated);

  if (!ready) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href={'/(auth)/login' as any} />;
  if (user && user.status !== 'approved') return <PendingGate status={user.status} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg1 }]}>
      <Tabs
        screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' }, animation: 'shift' }}
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

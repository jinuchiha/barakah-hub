import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { canManageFunds } from '@/lib/roles';
import { darkColors } from '@/lib/theme';

export default function AdminLayout() {
  const { user } = useAuthStore();

  // Admins and supervisors enter; per-screen guards restrict admin-only pages.
  if (!canManageFunds(user?.role)) return <Redirect href="/(tabs)/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: darkColors.bg1 },
        headerTintColor: darkColors.primary,
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold', color: darkColors.text1 },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    />
  );
}

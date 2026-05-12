import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { darkColors } from '@/lib/theme';

export default function AdminLayout() {
  const { user } = useAuthStore();

  if (user?.role !== 'admin') return <Redirect href="/(tabs)/" />;

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

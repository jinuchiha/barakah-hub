import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/lib/useTheme';
import { canManageFunds } from '@/lib/roles';

export default function AdminLayout() {
  const { user } = useAuthStore();
  const { colors } = useTheme();

  if (!canManageFunds(user?.role)) return <Redirect href={"/(tabs)" as any} />;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bg1 },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold', color: colors.text1 },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    />
  );
}

import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/lib/useTheme';
import { canManageFunds } from '@/lib/roles';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function AdminLayout() {
  const { user, isLoading, isAuthenticated } = useAuthStore();
  const { colors } = useTheme();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href={"/(auth)/login" as any} />;
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

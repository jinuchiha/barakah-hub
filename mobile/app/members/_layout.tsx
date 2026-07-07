import { Stack } from 'expo-router';
import { useTheme } from '@/lib/useTheme';

export default function MembersLayout() {
  const { colors } = useTheme();
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

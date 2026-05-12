import { Stack } from 'expo-router';
import { darkColors } from '@/lib/theme';

export default function MembersLayout() {
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

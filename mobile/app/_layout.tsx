import '../global.css';
import React, { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import i18n, { initI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ALL_THEMES, type ThemeName } from '@/lib/theme';
import { ThemeContext, themeNameToMode } from '@/lib/useTheme';
import { OfflineBanner } from '@/components/OfflineBanner';
import { startNetworkListener } from '@/lib/offline';
import { setupDeepLinkListener, handleInitialURL } from '@/lib/deep-link';
import { queryPersister } from '@/lib/query-persist';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const THEME_KEY = 'bh_theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { refreshSession, isLoading } = useAuth();

  useEffect(() => {
    initI18n().then(() => refreshSession());
    startNetworkListener();
    const cleanupDeepLink = setupDeepLinkListener();
    void handleInitialURL();
    return cleanupDeepLink;
  }, [refreshSession]);

  if (isLoading) return <LoadingScreen />;
  return <>{children}</>;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('dark');

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then((stored) => {
        const valid: ThemeName[] = ['dark', 'light', 'amoled', 'cyberpunk', 'desert'];
        if (stored && valid.includes(stored as ThemeName)) {
          setThemeName(stored as ThemeName);
        }
      })
      .catch(() => undefined);
  }, []);

  const setTheme = useCallback(async (name: ThemeName) => {
    setThemeName(name);
    await SecureStore.setItemAsync(THEME_KEY, name).catch(() => undefined);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(themeName === 'dark' ? 'light' : 'dark');
  }, [themeName, setTheme]);

  const themeColors = ALL_THEMES[themeName];
  const mode = themeNameToMode(themeName);

  return (
    <ThemeContext.Provider value={{ mode, themeName, colors: themeColors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded) return <LoadingScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: queryPersister }}
        >
          <I18nextProvider i18n={i18n}>
            <ThemeProvider>
              <AuthInitializer>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="members" />
                  <Stack.Screen name="admin" />
                  <Stack.Screen name="notifications" />
                  <Stack.Screen name="onboarding" />
                  <Stack.Screen name="lock" options={{ animation: 'fade' }} />
                  <Stack.Screen name="ai-assistant" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
                  <Stack.Screen name="achievements" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="family-tree" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="qr-pay" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
                  <Stack.Screen name="settings/language" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="settings/theme" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="settings/reminders" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="tools/index" options={{ animation: 'slide_from_right' }} />
                </Stack>
                <OfflineBanner />
              </AuthInitializer>
              <StatusBar style="light" translucent />
            </ThemeProvider>
          </I18nextProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

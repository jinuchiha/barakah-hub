import '../global.css';
import React, { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { Persister } from '@tanstack/react-query-persist-client';
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
import { NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_600SemiBold } from '@expo-google-fonts/noto-nastaliq-urdu';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import i18n, { initI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ALL_THEMES, type ThemeName } from '@/lib/theme';
import { ThemeContext, themeNameToMode } from '@/lib/useTheme';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PushManager } from '@/components/PushManager';
import { startNetworkListener } from '@/lib/offline';
import { setupDeepLinkListener, handleInitialURL } from '@/lib/deep-link';
import { initQueryPersister } from '@/lib/query-persist';
import { queryClient } from '@/lib/query-client';
import { isScreenshotProtectionEnabled, enableScreenCapturePrevention } from '@/lib/security';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const THEME_KEY = 'bh_theme';
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24h — stale financial data expires

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { refreshSession, isLoading } = useAuth();

  useEffect(() => {
    initI18n()
      .then(() => refreshSession())
      .catch(() => undefined);
    startNetworkListener();
    // Re-apply the user's screenshot-protection preference on every launch
    // (the native flag does not persist across app restarts).
    isScreenshotProtectionEnabled()
      .then((on) => (on ? enableScreenCapturePrevention() : undefined))
      .catch(() => undefined);
    const cleanupDeepLink = setupDeepLinkListener();
    void handleInitialURL();
    return cleanupDeepLink;
  }, [refreshSession]);

  if (isLoading) return <LoadingScreen />;
  return (
    <>
      <PushManager />
      {children}
    </>
  );
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
    NotoNastaliqUrdu_400Regular,
    NotoNastaliqUrdu_600SemiBold,
  });
  const [persister, setPersister] = useState<Persister | null>(null);

  useEffect(() => {
    initQueryPersister().then(setPersister).catch(() => setPersister(null));
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded || !persister) return <LoadingScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: CACHE_MAX_AGE }}
        >
          <I18nextProvider i18n={i18n}>
            <ThemeProvider>
              <AuthInitializer>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    animationDuration: 280,
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                >
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="members" />
                  <Stack.Screen name="admin" />
                  <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="onboarding" />
                  <Stack.Screen name="lock" options={{ animation: 'fade' }} />
                  <Stack.Screen name="ai-assistant" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
                  <Stack.Screen name="achievements" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="family-tree" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="qr-pay" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
                  <Stack.Screen name="settings/language" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="settings/theme" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="settings/reminders" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="settings/edit-profile" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="settings/change-password" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="settings/help" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="settings/contact-admin" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="tools/index" options={{ animation: 'slide_from_right' }} />
                  <Stack.Screen name="search" options={{ animation: 'fade' }} />
                  <Stack.Screen name="about" options={{ animation: 'fade_from_bottom' }} />
                  <Stack.Screen name="messages" options={{ animation: 'slide_from_right' }} />
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

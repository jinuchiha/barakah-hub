import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { isOnboardingComplete } from '@/lib/onboarding';

export default function IndexRedirect() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    isOnboardingComplete().then(setOnboarded).catch(() => setOnboarded(true));
  }, []);

  if (isLoading || onboarded === null) return null;

  if (isAuthenticated) return <Redirect href={'/(tabs)' as any} />;
  // First launch: show the intro carousel once, then always go to login.
  return <Redirect href={(onboarded ? '/(auth)/login' : '/onboarding') as any} />;
}

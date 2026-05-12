import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { signIn, signOut, signUp, forgotPassword, getSession, fetchMyMember } from '@/lib/auth';
import { saveLanguage } from '@/lib/storage';
import { changeLanguage } from '@/lib/i18n';
import type { SignInInput, SignUpInput, ForgotPasswordInput } from '@/lib/auth';

export function useAuth() {
  const { user, isAuthenticated, isLoading, language, setUser, setLoading, setLanguage, logout } =
    useAuthStore();

  const login = useCallback(async (input: SignInInput): Promise<void> => {
    const member = await signIn(input);
    setUser(member);
  }, [setUser]);

  const register = useCallback(async (input: SignUpInput): Promise<void> => {
    await signUp(input);
  }, []);

  const sendForgotPassword = useCallback(async (input: ForgotPasswordInput): Promise<void> => {
    await forgotPassword(input);
  }, []);

  const performLogout = useCallback(async (): Promise<void> => {
    await signOut();
    logout();
  }, [logout]);

  const refreshSession = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const session = await getSession();
      if (session) {
        const member = await fetchMyMember();
        setUser({ ...member, email: session.user.email });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, [setUser, setLoading]);

  const switchLanguage = useCallback(async (lang: 'en' | 'ur') => {
    changeLanguage(lang);
    setLanguage(lang);
    await saveLanguage(lang);
  }, [setLanguage]);

  return {
    user,
    isAuthenticated,
    isLoading,
    language,
    login,
    register,
    sendForgotPassword,
    logout: performLogout,
    refreshSession,
    switchLanguage,
  };
}

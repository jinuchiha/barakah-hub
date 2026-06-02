import { create } from 'zustand';
import type { MemberWithSession } from '@/types';

type Language = 'en' | 'ur';

interface AuthState {
  user: MemberWithSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  language: Language;
  setUser: (user: MemberWithSession | null) => void;
  setLoading: (loading: boolean) => void;
  setLanguage: (lang: Language) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  language: 'en',

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setLanguage: (language) => set({ language }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));

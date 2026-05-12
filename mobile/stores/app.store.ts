import { create } from 'zustand';

interface AppState {
  isNetworkConnected: boolean;
  globalLoading: boolean;
  notificationCount: number;
  setNetworkConnected: (connected: boolean) => void;
  setGlobalLoading: (loading: boolean) => void;
  setNotificationCount: (count: number) => void;
  decrementNotificationCount: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isNetworkConnected: true,
  globalLoading: false,
  notificationCount: 0,

  setNetworkConnected: (isNetworkConnected) => set({ isNetworkConnected }),
  setGlobalLoading: (globalLoading) => set({ globalLoading }),
  setNotificationCount: (notificationCount) => set({ notificationCount }),
  decrementNotificationCount: () =>
    set({ notificationCount: Math.max(0, get().notificationCount - 1) }),
}));

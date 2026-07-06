'use client';
import { useSyncExternalStore } from 'react';
import type { Locale } from './dict';

/**
 * Locale for Client Components — mirrors the `barakah_lang` value the
 * topbar picker writes (localStorage + cookie + storage event), so
 * client widgets flip language without a reload.
 */
const store = {
  subscribe: (cb: () => void) => {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', cb);
    return () => window.removeEventListener('storage', cb);
  },
  getSnapshot: (): Locale =>
    typeof window !== 'undefined' && localStorage.getItem('barakah_lang') === 'ur' ? 'ur' : 'en',
  getServerSnapshot: (): Locale => 'en',
};

export function useLocale(): Locale {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

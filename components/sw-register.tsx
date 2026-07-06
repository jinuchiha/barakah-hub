'use client';
import { useEffect } from 'react';

/**
 * Registers the service worker on mount. Mounted from the root layout so
 * every route benefits from offline caching + push notifications.
 *
 * Renders nothing — pure side effect.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('[sw] registration failed', err));
  }, []);

  return null;
}

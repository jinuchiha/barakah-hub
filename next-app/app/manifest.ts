import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Barakah Hub',
    short_name: 'Barakah Hub',
    description: 'Barakah Hub · Islamic family fund: sadqa, qarz-e-hasana, emergency vote, audit trail',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    // Match the app's actual body background (globals.css) and the viewport
    // themeColor in layout.tsx — the install splash and address bar used to
    // flash colors the app never renders.
    background_color: '#060b13',
    theme_color: '#0a0f1a',
    lang: 'en',
    dir: 'ltr',
    categories: ['finance', 'lifestyle', 'social'],
    icons: [
      { src: '/icon.svg',                sizes: 'any',     type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg',       sizes: 'any',     type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icon.png',                sizes: '64x64',   type: 'image/png',     purpose: 'any' },
      { src: '/icon-192.png',            sizes: '192x192', type: 'image/png',     purpose: 'any' },
      { src: '/icon-512.png',            sizes: '512x512', type: 'image/png',     purpose: 'any' },
      { src: '/icon-maskable-512.png',   sizes: '512x512', type: 'image/png',     purpose: 'maskable' },
    ],
  };
}

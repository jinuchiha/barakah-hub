import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Barakah Hub',
    short_name: 'Barakah Hub',
    description: 'Barakah Hub — Islamic family fund: sadqa, qarz-e-hasana, emergency vote, audit trail',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0a0a08',
    theme_color: '#c9a84c',
    lang: 'en',
    dir: 'ltr',
    categories: ['finance', 'lifestyle', 'social'],
    icons: [
      { src: '/icon.svg',          sizes: 'any',   type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any',   type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icon',              sizes: '64x64', type: 'image/png',     purpose: 'any' },
    ],
  };
}

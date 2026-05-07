import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bait ul Maal BalochSath',
    short_name: 'BalochSath',
    description: 'Islamic family fund — sadqa, qarz-e-hasana, emergency vote, full audit trail',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0a0a08',
    theme_color: '#c9a84c',
    lang: 'ur',
    dir: 'rtl',
    categories: ['finance', 'lifestyle', 'social'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
}

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { ServiceWorkerRegister } from '@/components/sw-register';

export const metadata: Metadata = {
  // Template applies a crescent to every sub-page title automatically.
  // Sub-pages set `title: 'Fund Register · Barakah Hub'` etc; the template
  // wraps them as "🌙 Fund Register · Barakah Hub".
  title: {
    default: '🌙 Barakah Hub',
    template: '🌙 %s',
  },
  description: 'Barakah Hub · Islamic family fund: sadqa, qarz-e-hasana, emergency vote, audit trail',
  manifest: '/manifest.webmanifest',
  applicationName: 'Barakah Hub',
  appleWebApp: { capable: true, title: 'Barakah Hub', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1a' },
    { media: '(prefers-color-scheme: light)', color: '#f7f5f0' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className="theme-gold dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Noto+Nastaliq+Urdu:wght@400;500;600;700&family=Amiri:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ServiceWorkerRegister />
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#0f1626',
              color: '#ecebe6',
              border: '1px solid rgba(255,255,255,0.10)',
            },
          }}
        />
      </body>
    </html>
  );
}

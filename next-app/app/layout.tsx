import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { ServiceWorkerRegister } from '@/components/sw-register';

export const metadata: Metadata = {
  title: 'Barakah Hub — Islamic Family Fund',
  description: 'Barakah Hub — Islamic family fund: sadqa, qarz-e-hasana, emergency vote, audit trail',
  manifest: '/manifest.webmanifest',
  applicationName: 'Barakah Hub',
  appleWebApp: { capable: true, title: 'Barakah Hub', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#14171c' },
    { media: '(prefers-color-scheme: light)', color: '#f5f3ed' },
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
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cinzel:wght@400;500;600;700&family=Tajawal:wght@300;400;500;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap"
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
              background: '#1d2127',
              color: '#ebe7dd',
              border: '1px solid rgba(214,210,199,0.18)',
            },
          }}
        />
      </body>
    </html>
  );
}

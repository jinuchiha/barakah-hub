import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Barakah Hub — Islamic Family Fund',
  description: 'Barakah Hub — Islamic family fund: sadqa, qarz-e-hasana, emergency vote, audit trail',
  manifest: '/manifest.webmanifest',
  applicationName: 'Barakah Hub',
  appleWebApp: { capable: true, title: 'Barakah Hub', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a08' },
    { media: '(prefers-color-scheme: light)', color: '#faf8f4' },
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
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cinzel:wght@400;500;600;700&family=Tajawal:wght@300;400;500;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'linear-gradient(135deg,#1f4e3a,#2d8364)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            },
          }}
        />
      </body>
    </html>
  );
}

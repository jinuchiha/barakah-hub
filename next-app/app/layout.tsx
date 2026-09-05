import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Cormorant_Garamond, Noto_Nastaliq_Urdu, Amiri } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ServiceWorkerRegister } from '@/components/sw-register';

/**
 * Fonts are self-hosted via next/font: no render-blocking third-party
 * stylesheet, no preconnect round-trips, and automatic size-adjust fallback
 * metrics (less CLS). Each exposes a CSS variable consumed by the font
 * tokens in globals.css.
 */
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter-v', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono-v', display: 'swap' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-display-v', display: 'swap' });
const nastaliq = Noto_Nastaliq_Urdu({ subsets: ['arabic'], weight: ['400', '500', '600', '700'], variable: '--font-urdu-v', display: 'swap' });
const amiri = Amiri({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-naskh-v', display: 'swap' });

const FONT_VARS = `${inter.variable} ${jetbrains.variable} ${cormorant.variable} ${nastaliq.variable} ${amiri.variable}`;

export const metadata: Metadata = {
  // Template applies a crescent to every sub-page title automatically.
  // Sub-pages set `title: 'Fund Register · Barakah Hub'` etc; the template
  // wraps them as "🌙 Fund Register · Barakah Hub".
  title: {
    default: '🌙 Barakah Hub',
    template: '🌙 %s',
  },
  description: 'Barakah Hub · Islamic family fund: sadqa, qarz-e-hasana, emergency vote, audit trail',
  // Real favicon so the browser tab shows the app icon instead of the blank
  // white document placeholder.
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.webmanifest',
  applicationName: 'Barakah Hub',
  // Inherited by every route: approve/invite links travel over WhatsApp, and
  // without OG tags each shared link rendered a blank preview card.
  openGraph: {
    siteName: 'Barakah Hub',
    type: 'website',
    title: 'Barakah Hub',
    description: 'Islamic family fund: sadaqah, qarz-e-hasana, emergency vote, audit trail.',
  },
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
    <html lang="en" dir="ltr" className={`dark ${FONT_VARS}`} suppressHydrationWarning>
      <body>
        {/* Apply the saved light/dark choice before first paint — without
            this the mode reset on every reload ("theme change nahi hoti"). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{var m=localStorage.getItem('bh-mode');if(m==='light'){document.documentElement.classList.add('light');document.documentElement.classList.remove('dark');}}catch(e){}",
          }}
        />
        <ServiceWorkerRegister />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--surf-1)',
              color: 'var(--txt-1)',
              border: '1px solid var(--border-2)',
            },
          }}
        />
      </body>
    </html>
  );
}

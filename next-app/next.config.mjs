import { withSentryConfig } from '@sentry/nextjs';
import { buildSecurityHeaders } from './lib/security-headers.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: buildSecurityHeaders(process.env.NODE_ENV !== 'production'),
      },
    ];
  },
  // Next 16: typedRoutes moved out of experimental
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    // Deployment target is Vercel (see vercel.json — crons, buildCommand),
    // where the image optimizer is available. The old `unoptimized: true`
    // was justified by a Cloudflare/OpenNext target that no longer applies;
    // it made every full-resolution phone-camera avatar download into a
    // 28-56px circle.
    unoptimized: false,
    remotePatterns: [
      // Vercel Blob — avatar + receipt uploads
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      // Keep R2 patterns ready for future migration
      // { protocol: 'https', hostname: 'pub-*.r2.dev' },
    ],
  },
};

// Sentry wrapping is safe to apply unconditionally — the SDK itself
// no-ops when SENTRY_DSN is unset (see sentry.*.config.ts), and the
// source-map upload step just skips silently without SENTRY_AUTH_TOKEN.
export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});

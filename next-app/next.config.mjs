import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 16: typedRoutes moved out of experimental
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  images: {
    unoptimized: true,
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

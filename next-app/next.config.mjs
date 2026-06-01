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

// OpenNext for Cloudflare Workers handles dev-platform bindings via its
// `opennextjs-cloudflare preview` command — no setup needed in this file.

export default nextConfig;

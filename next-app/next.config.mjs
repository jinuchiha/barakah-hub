/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 16: typedRoutes moved out of experimental
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  images: {
    // Cloudflare Workers don't run the Next image-optimisation pipeline,
    // and our scale doesn't need it. Add R2 hosts here when Phase 6
    // (storage migration) lands.
    unoptimized: true,
    remotePatterns: [
      // Cloudflare R2 public URLs — uncomment + fill when Phase 6 ships.
      // { protocol: 'https', hostname: 'pub-*.r2.dev' },
      // { protocol: 'https', hostname: '<your-bucket>.r2.cloudflarestorage.com' },
    ],
  },
};

// OpenNext for Cloudflare Workers handles dev-platform bindings via its
// `opennextjs-cloudflare preview` command — no setup needed in this file.

export default nextConfig;

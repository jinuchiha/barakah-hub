/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 16: typedRoutes moved out of experimental
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  images: {
    // Cloudflare Workers don't run the Next image-optimisation pipeline.
    // Supabase delivers WebP-ready originals; loaders aren't required at our scale.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
    ],
  },
};

// OpenNext for Cloudflare Workers handles dev-platform bindings via its
// `opennextjs-cloudflare preview` command — no setup needed in this file.

export default nextConfig;

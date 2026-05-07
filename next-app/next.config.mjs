/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  images: {
    // Cloudflare Pages doesn't run the Image Optimization API by default — disable it.
    // Supabase delivers WebP-ready originals; loaders not required for our scale.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
    ],
  },
};

// Required for Cloudflare Pages local preview (next-on-pages dev binding)
if (process.env.NODE_ENV === 'development') {
  await import('@cloudflare/next-on-pages/next-dev').then((m) =>
    m.setupDevPlatform?.(),
  ).catch(() => {});
}

export default nextConfig;

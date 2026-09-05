import type { MetadataRoute } from 'next';

/**
 * A private family fund: only the marketing landing page and the legal pages
 * are for crawlers. Everything behind auth (and the token routes) is
 * disallowed — the middleware enforces access, this just keeps well-behaved
 * crawlers from even trying.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/terms', '/privacy', '/login', '/register'],
        disallow: ['/api/', '/dashboard', '/admin/', '/myaccount', '/cases', '/messages', '/notifications', '/settings', '/tools', '/tree', '/search', '/ai', '/join/', '/approve/', '/verify-receipt/'],
      },
    ],
  };
}

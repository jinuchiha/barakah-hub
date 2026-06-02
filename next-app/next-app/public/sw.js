// Barakah Hub service worker — installable PWA + TWA support.
//
// Strategy:
//   - Network-first for navigation requests (HTML) — always try the latest server response
//   - Stale-while-revalidate for static assets (images, fonts, SVG)
//   - Bypass for /api/* and Next.js Server Action requests — never cache mutations
//   - Handles Web Push notifications when permission is granted

const CACHE = 'barakah-hub-v1';
const STATIC_EXTS = /\.(?:png|jpg|jpeg|svg|webp|ico|css|woff2?|ttf)$/i;

self.addEventListener('install', (event) => {
  // Take over the page as soon as the new SW is installed
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API or Server Action calls
  if (url.pathname.startsWith('/api/')) return;
  if (req.headers.get('next-action')) return;

  // Network-first for HTML/navigation — guarantees fresh server-rendered data
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Stale-while-revalidate for static assets
  if (STATIC_EXTS.test(url.pathname) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req)
            .then((res) => {
              if (res.ok) cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || network;
        }),
      ),
    );
  }
});

// ─── Web Push (TWA delivers Chrome push payloads natively) ─────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'Barakah Hub', body: event.data.text() }; }
  const title = payload.title || 'Barakah Hub';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.url || '/' },
    tag: payload.tag || 'barakah-hub',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});

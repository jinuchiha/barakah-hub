// Barakah Hub service worker — installable PWA + TWA support.
//
// Strategy:
//   - Navigations (HTML) are NEVER cached. Every page behind auth renders
//     member names and money figures; persisting that HTML to Cache Storage
//     keyed only by URL leaks one user's dashboard to the next user of a
//     shared device. Offline navigation gets a neutral offline page instead.
//   - Stale-while-revalidate for static assets (images, fonts, SVG)
//   - Bypass for /api/* and Next.js Server Action requests — never cache mutations
//   - Handles Web Push notifications when permission is granted

// v2: cache-name bump purges v1 caches, which contained authenticated HTML.
const CACHE = 'barakah-hub-v2';

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Barakah Hub</title>
<style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#0a0f1a;color:#ece9e0;font-family:system-ui,sans-serif;text-align:center}
p{color:#9aa0ab;font-size:14px;max-width:32ch;line-height:1.6}</style></head>
<body><div><div style="font-size:34px">☾</div><h1 style="font-size:19px;font-weight:600">You&rsquo;re offline</h1>
<p>Barakah Hub needs a connection to show live fund data. Reconnect and try again.</p></div></body></html>`;
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

  // Navigations: network only, never cached (see header comment). Offline
  // falls back to a neutral shell that contains no user data.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req).catch(
        () => new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
      ),
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

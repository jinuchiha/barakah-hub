// Barakah Hub (legacy single-HTML predecessor) — minimal service worker
// Caches the app shell so it's installable + offline-capable.
// Strategy: stale-while-revalidate for the HTML shell.
// Cache name bumped to bust the previous "balochsath-*" caches on rename.
const CACHE = 'barakah-hub-v1-2026-05-08';
const SHELL = ['./index.html', './manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  // Stale-while-revalidate
  e.respondWith(
    caches.match(request).then((cached) => {
      const networked = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type !== 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});

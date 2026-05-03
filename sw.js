/* EVSpend Service Worker — Phase P Sprint 3
 *
 * Strategy:
 *   - Versioned assets (?v=…)  → cache-first, immutable lifetime
 *   - Static asset extensions   → cache-first, refresh in background
 *   - HTML / navigation         → stale-while-revalidate
 *   - Everything else / cross-origin → pass-through (no SW handling)
 *
 * Cache invalidation: bumping CACHE_VERSION below drops both caches on
 * the next activate. Use a date-stamp suffix to make intent explicit.
 *
 * Range requests, POST/PUT, and any request explicitly opting out via
 * `cache: 'no-store'` are skipped to avoid breaking partial-content
 * downloads or fresh-fetch semantics.
 */

const CACHE_VERSION  = 'v20260503-csv1';
const STATIC_CACHE   = 'evspend-static-' + CACHE_VERSION;
const RUNTIME_CACHE  = 'evspend-runtime-' + CACHE_VERSION;

// Minimal offline shell. Kept short so first install is fast; the rest
// is filled by the runtime cache as the user navigates.
const PRECACHE_URLS = [
  '/',
  '/site.webmanifest',
  '/banner.webp?v=20260502-brand1',
  '/banner.png?v=20260502-brand1',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.headers.has('Range')) return;
  if (request.cache === 'no-store') return;

  let url;
  try { url = new URL(request.url); }
  catch (_) { return; }

  if (url.origin !== self.location.origin) return;

  // Don't cache the SW itself.
  if (url.pathname === '/sw.js') return;

  const isVersioned    = url.search.indexOf('v=') !== -1;
  const isStaticAsset  = /\.(?:js|css|woff2?|ttf|png|jpe?g|webp|svg|ico|xml|webmanifest)$/i
                          .test(url.pathname);
  const isNavigation   = request.mode === 'navigate' ||
                         (request.headers.get('Accept') || '').indexOf('text/html') !== -1;

  if (isVersioned || isStaticAsset) {
    event.respondWith(cacheFirst(request));
  } else if (isNavigation) {
    event.respondWith(staleWhileRevalidate(request));
  }
  // else: pass-through (browser default)
});

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response && response.ok && response.status === 200 && response.type !== 'opaque') {
        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
      }
      return response;
    }).catch(() => caches.match('/'));
  });
}

function staleWhileRevalidate(request) {
  return caches.open(RUNTIME_CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response && response.ok && response.status === 200) {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
}

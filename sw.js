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

const CACHE_VERSION  = 'v20260503-offline-core2';
const STATIC_CACHE   = 'evspend-static-' + CACHE_VERSION;
const RUNTIME_CACHE  = 'evspend-runtime-' + CACHE_VERSION;

// Offline shell. Covers calculator + history shell for both locales so
// the installed PWA opens cold without a network round-trip; the rest
// is filled by the runtime cache as the user navigates.
//
// Both the clean-URL form (/verlauf) and the .html sibling are listed
// because Vercel cleanUrls serves the same content under both keys and
// Cache API matches request URLs exactly — we want either lookup to hit.
const PRECACHE_URLS = [
  '/',
  '/en-eu/',
  '/verlauf',
  '/en-eu/verlauf',
  '/verlauf.html',
  '/en-eu/verlauf.html',
  '/site.webmanifest',
  '/styles-app.min.css?v=20260501-legal18',
  '/theme-init.js?v=20260501-legal3',
  '/script.min.js?v=20260501-legal17',
  '/verlauf.min.js?v=20260501-legal19',
  '/vendor/chart-4.4.6.umd.js',
  '/fonts/InterVariable.woff2',
  '/banner.webp?v=20260502-brand1',
  '/banner.png?v=20260502-brand1',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
];

self.addEventListener('install', (event) => {
  // Use individual cache.add() calls under Promise.allSettled so a single
  // missing or failing entry can't abort the whole install (cache.addAll
  // is all-or-nothing).
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(url))
      ))
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
  // Look across STATIC_CACHE and RUNTIME_CACHE so navigation requests can
  // see precached entries (the previous RUNTIME_CACHE-only lookup missed
  // anything seeded at install time).
  return caches.match(request).then((cached) => {
    const network = fetch(request).then((response) => {
      if (response && response.ok && response.status === 200) {
        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
      }
      return response;
    }).catch(() => cached || navigationFallback(new URL(request.url)));
    return cached || network;
  });
}

// When a navigation goes offline and no exact cache entry exists, walk a
// short candidate list so clean-URL routes (/verlauf) can still resolve
// via their .html sibling, locale roots survive a missing trailing slash,
// and anything else falls back to the site root.
function navigationFallback(url) {
  const path = url.pathname;
  const candidates = [];
  if (path === '/verlauf') {
    candidates.push('/verlauf', '/verlauf.html');
  } else if (path === '/en-eu/verlauf') {
    candidates.push('/en-eu/verlauf', '/en-eu/verlauf.html');
  } else if (path === '/en-eu') {
    candidates.push('/en-eu/');
  }
  candidates.push('/');
  return candidates.reduce(
    (chain, candidate) => chain.then((found) => found || caches.match(candidate)),
    Promise.resolve(undefined)
  );
}

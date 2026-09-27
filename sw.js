/* EVSpend Service Worker — Phase P Sprint 3
 *
 * Strategy:
 *   - Versioned assets (?v=…)  → cache-first, immutable lifetime
 *   - Static asset extensions   → cache-first, refresh in background
 *   - HTML / navigation         → stale-while-revalidate
 *   - Everything else / cross-origin → pass-through (no SW handling)
 *
 * Cache invalidation: CACHE_VERSION below is injected at build time by
 * build-sw.mjs (from VERCEL_GIT_COMMIT_SHA, else a Date.now() timestamp),
 * so it changes on every build and drops both caches on the next activate.
 * Do not edit the value by hand — build-sw.mjs is the single source.
 *
 * Range requests, POST/PUT, and any request explicitly opting out via
 * `cache: 'no-store'` are skipped to avoid breaking partial-content
 * downloads or fresh-fetch semantics.
 */

const CACHE_VERSION          = 'v1790528851861';
const STATIC_CACHE_PREFIX    = 'evspend-static-';
const RUNTIME_CACHE_PREFIX   = 'evspend-runtime-';
const STATIC_CACHE           = STATIC_CACHE_PREFIX + CACHE_VERSION;
const RUNTIME_CACHE          = RUNTIME_CACHE_PREFIX + CACHE_VERSION;

// Offline shell. Covers calculator + history shell for both locales so
// the installed PWA opens cold without a network round-trip; the rest
// is filled by the runtime cache as the user navigates.
//
// Both the clean-URL form (/verlauf) and the .html sibling are listed
// because Vercel cleanUrls serves the same content under both keys and
// Cache API matches request URLs exactly — we want either lookup to hit.
const REQUIRED_PRECACHE_URLS = [
  '/history-store.js?v=20260927-h1',
  '/',
  '/en-eu/',
  '/tr/',
  '/verlauf',
  '/en-eu/verlauf',
  '/tr/verlauf',
  '/verlauf.html',
  '/en-eu/verlauf.html',
  '/tr/verlauf.html',
  '/site.webmanifest',
  '/styles-app.min.css?v=20260601-audit-fix-2',
  '/theme-init.js?v=20260619-wfinal',
  '/script.min.js?v=20260619-wfinal',
  '/verlauf.min.js?v=20260619-wfinal',
  '/en-eu/init-eu.js?v=20260501-legal3',
  '/en-eu/styles-en-eu.css?v=20260501-legal3',
  '/tr/init-tr.js?v=20260601-audit-3b2',
  '/tr/styles-tr.css?v=20260601-audit-3b2',
  '/vendor/chart-4.4.6.umd.js',
  '/fonts/InterVariable.woff2',
];

const OPTIONAL_PRECACHE_URLS = [
  '/styles-pages.min.css?v=20260501-legal3',
  '/lang-switch.js?v=20260501-legal3',
  '/fonts/InterVariable-Italic.woff2',
  '/banner.webp?v=20260502-brand1',
  '/banner.png?v=20260502-brand1',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(installGeneration());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.allSettled(
        keys
          .filter((key) => isEvsCache(key) && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
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

  if (isNavigation) {
    event.respondWith(staleWhileRevalidate(request, event));
  } else if (isVersioned || isStaticAsset) {
    event.respondWith(cacheFirst(request));
  }
  // else: pass-through (browser default)
});

function cacheFirst(request) {
  return matchCurrentGeneration(request).catch(() => undefined).then((cached) => {
    if (cached) return cached;
    return fetch(request).then(async (response) => {
      await cacheRuntimeResponse(request, response).catch(() => {});
      return response;
    }).catch(() => Response.error());
  });
}

function staleWhileRevalidate(request, event) {
  const cached = matchCurrentGeneration(request, undefined, true).catch(() => undefined);
  const network = cached.then(() => fetch(request)).then(async (response) => {
    await cacheRuntimeResponse(request, response).catch(() => {});
    return response;
  });
  event.waitUntil(network.then(() => undefined, () => undefined));
  return cached.then((cachedResponse) =>
    cachedResponse || network.catch(() => navigationFallback(new URL(request.url)))
  );
}

function navigationFallback(url) {
  const path = url.pathname;
  const candidates = [path];
  if (path === '/verlauf') {
    candidates.push('/verlauf.html');
  } else if (path === '/en-eu/verlauf') {
    candidates.push('/en-eu/verlauf.html');
  } else if (path === '/en-eu') {
    candidates.push('/en-eu/');
  } else if (path === '/tr/verlauf') {
    candidates.push('/tr/verlauf.html');
  } else if (path === '/tr') {
    candidates.push('/tr/');
  } else if (path === '/index.html') {
    candidates.push('/');
  } else if (path === '/en-eu/index.html') {
    candidates.push('/en-eu/');
  } else if (path === '/tr/index.html') {
    candidates.push('/tr/');
  } else if (path.endsWith('.html')) {
    candidates.push(path.slice(0, -5));
  }
  return [...new Set(candidates)].reduce(
    (chain, candidate) => chain.then((found) =>
      found || matchCurrentGeneration(candidate, undefined, true).catch(() => undefined)
    ),
    Promise.resolve(undefined)
  ).then((found) => found || offlineNavigationResponse(url));
}

async function installGeneration() {
  try {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(
      REQUIRED_PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' }))
    );

    await Promise.allSettled(
      OPTIONAL_PRECACHE_URLS.map((url) => fetchAndCache(cache, url))
    );
    await self.skipWaiting();
  } catch (error) {
    await Promise.allSettled([
      caches.delete(STATIC_CACHE),
      caches.delete(RUNTIME_CACHE),
    ]);
    throw error;
  }
}

async function fetchAndCache(cache, url) {
  const response = await fetch(new Request(url, { cache: 'reload' }));
  if (!response || !response.ok) {
    throw new Error('Precache request failed: ' + url);
  }
  await cache.put(url, response);
}

async function matchCurrentGeneration(request, options, preferRuntime = false) {
  // Revalidated HTML supersedes its precache copy. Assets retain static-first.
  const names = preferRuntime ? [RUNTIME_CACHE, STATIC_CACHE] : [STATIC_CACHE, RUNTIME_CACHE];
  for (const name of names) {
    // An unreadable cache must not hide the other cache's usable offline copy.
    const response = await caches.open(name)
      .then((cache) => cache.match(request, options))
      .catch(() => undefined);
    if (response) return response;
  }
}

async function cacheRuntimeResponse(request, response) {
  if (!response || !response.ok || response.status !== 200 || response.type === 'opaque') return;
  const clone = response.clone();
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, clone);
}

function isEvsCache(key) {
  return key.startsWith(STATIC_CACHE_PREFIX) || key.startsWith(RUNTIME_CACHE_PREFIX);
}

function offlineNavigationResponse(url) {
  const path = url.pathname;
  let language = 'de';
  let title = 'Offline nicht verfügbar';
  let message = 'Diese Seite ist offline nicht verfügbar. Stelle eine Internetverbindung her und versuche es erneut.';

  if (path === '/tr' || path.startsWith('/tr/') || /\.tr(?:\.html)?$/.test(path)) {
    language = 'tr';
    title = 'Çevrimdışı kullanılamıyor';
    message = 'Bu sayfa çevrimdışı kullanılamıyor. İnternet bağlantısı kurup yeniden deneyin.';
  } else if (path === '/en-eu' || path.startsWith('/en-eu/') ||
             path === '/privacy-policy' || path === '/privacy-policy.html' ||
             /\.en(?:\.html)?$/.test(path)) {
    language = 'en';
    title = 'Unavailable offline';
    message = 'This page is not available offline. Connect to the internet and try again.';
  }

  return new Response(
    '<!doctype html><html lang="' + language + '"><meta charset="utf-8"><title>' + title +
    '</title><meta name="viewport" content="width=device-width,initial-scale=1"><body><main><h1>' +
    title + '</h1><p>' + message + '</p></main></body></html>',
    {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Language': language,
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  );
}

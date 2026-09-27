import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.EVSPEND_TEST_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://www.evspend.com';
// Import the actual production module without changing package type or copying its logic.
const source = fs.readFileSync(path.join(ROOT, 'middleware.js'), 'utf8');
const { default: middleware, config } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const read = name => fs.readFileSync(path.join(ROOT, name), 'utf8');
const canonical = html => new URL(html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)[1]);
const shellFiles = ['index.html', 'verlauf.html', 'en-eu/index.html', 'en-eu/verlauf.html', 'tr/index.html', 'tr/verlauf.html'];
const shellRoutes = new Set(shellFiles.map(name => canonical(read(name)).pathname));
const legalRoutes = [...new Set([
  ...[...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname).filter(route => !shellRoutes.has(route)),
  canonical(read('privacy-policy.html')).pathname,
])];

function request(route, country, ua = 'EVSpend regression') {
  const headers = { 'user-agent': ua };
  if (country !== null) headers['x-vercel-ip-country'] = country;
  return new Request(new URL(route, ORIGIN), { headers });
}

// File existence under the existing cleanUrls setting, not a simulated hosting router.
function htmlAt(route) {
  const pathname = new URL(route, ORIGIN).pathname;
  return read(pathname.endsWith('/') ? pathname.slice(1) + 'index.html' : pathname.slice(1) + '.html');
}

for (const [country, prefix] of [
  ['DE', null], ['AT', null], ['CH', null], ['LI', null],
  ['US', null], ['CA', null], ['MX', null],
  ['TR', '/tr'], ['FR', '/en-eu'], [null, '/en-eu'], ['ZZ', '/en-eu'],
]) {
  test(`EVS-050 Geo ${country ?? 'ohne Header'} erhält Rechner und Verlauf samt Parametern`, () => {
    for (const route of ['/', '/verlauf']) {
      const input = request(`${route}?id=eaf_0123456789abcdef0123456789abcdef&entryKey=abc&entryIndex=2&x=a%2Bb&x=c+d`, country);
      const response = middleware(input);
      if (prefix === null) {
        assert.equal(response, undefined);
        continue;
      }
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('Set-Cookie'), null);
      const target = new URL(response.headers.get('Location'));
      const original = new URL(input.url);
      assert.equal(target.origin, original.origin);
      assert.equal(target.pathname, prefix + route);
      assert.equal(target.search, original.search);
      assert.equal(target.hash, original.hash);
      const html = htmlAt(target);
      assert.equal(canonical(html).pathname, target.pathname);
      assert.equal(html.match(/<html lang="([^"]+)"/)[1], prefix === '/tr' ? 'tr' : 'en');
      assert.equal(middleware(request(target, country)), undefined, 'direct target has no second redirect');
    }
  });
}

test('EVS-050 Matcher und Laufzeit begrenzen Geo auf die kanonischen Basisshells', () => {
  assert.deepEqual(config.matcher, ['/', '/verlauf']);
  for (const route of config.matcher) assert.ok(shellRoutes.has(route));
  assert.equal(JSON.parse(read('vercel.json')).cleanUrls, true);
});

test('EVS-050 Bots erreichen alle Varianten ohne Geoweiterleitung', () => {
  for (const country of ['DE', 'FR', 'TR', null]) {
    for (const ua of ['Googlebot/2.1', 'bingbot', 'Twitterbot', 'facebookexternalhit']) {
      for (const route of [...shellRoutes, ...legalRoutes]) assert.equal(middleware(request(route, country, ua)), undefined, `${country} ${ua} ${route}`);
    }
  }
});

test('EVS-050 alle bestehenden Rechtstextziele bleiben bei direktem Aufruf unverändert', () => {
  assert.equal(legalRoutes.length, 21);
  for (const route of legalRoutes) {
    assert.equal(canonical(htmlAt(route)).pathname, route);
    for (const country of ['DE', 'FR', 'TR', null, 'ZZ']) {
      assert.equal(middleware(request(`${route}?v=1#privacy`, country)), undefined, `${country} ${route}`);
    }
  }
});

test('EVS-050 bestehende Footer und Rechtstextsprachlinks treffen vorhandene kanonische Ziele', () => {
  let links = 0;
  for (const route of [...shellRoutes, ...legalRoutes]) {
    const html = htmlAt(route);
    for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)) {
      const target = new URL(match[1], ORIGIN + route);
      if (target.origin !== ORIGIN) continue;
      const legalNavigation = /data-set-locale=|data-i18n="footer(?:Impressum|Datenschutz|Terms|Hinweise|Barrierefreiheit)"/.test(match[0]);
      if (!legalNavigation && !legalRoutes.includes(target.pathname)) continue;
      assert.ok(legalRoutes.includes(target.pathname), `existing legal navigation: ${route} -> ${target.pathname}`);
      links++;
      assert.equal(canonical(htmlAt(target)).pathname, target.pathname);
      for (const country of ['FR', 'TR']) assert.equal(middleware(request(target, country)), undefined);
    }
  }
  assert.ok(links >= 100, `legal links checked: ${links}`);
});

test('EVS-050 gewählte Sprachshells bleiben für jedes Land ohne Schleife direkt erreichbar', () => {
  for (const route of shellRoutes) {
    if (config.matcher.includes(route)) continue;
    assert.equal(canonical(htmlAt(route)).pathname, route);
    for (const country of ['DE', 'FR', 'TR', null, 'ZZ']) assert.equal(middleware(request(route, country)), undefined);
  }
});

test('EVS-050 nichtkanonische Slashpfade, Assets und unbekannte Seiten erzeugen kein Geoziel', () => {
  for (const route of ['/verlauf/', '/en-eu', '/tr', '/index.html', '/verlauf.html', '/tr/verlauf/', '/impressum/', '/privacy-policy/', '/unbekannt', '/api/example', '/script.min.js', '/sitemap.xml']) {
    for (const country of ['FR', 'TR', null]) assert.equal(middleware(request(route, country)), undefined, `${country} ${route}`);
  }
});

test('EVS-050 URL Änderung erhält mitgelieferte Fragmente ohne neue Hashlogik', () => {
  // Browsers do not send fragments over HTTP. This checks only URL-object preservation.
  for (const country of ['FR', 'TR', null]) {
    for (const route of ['/?id=12345#calc', '/verlauf?entryKey=a%2Bb#history']) {
      const input = request(route, country);
      const target = new URL(middleware(input).headers.get('Location'));
      assert.equal(target.search, new URL(input.url).search);
      assert.equal(target.hash, new URL(input.url).hash);
    }
  }
});

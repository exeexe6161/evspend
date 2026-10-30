import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { toPatterns, buildHeadersFile, MAX_HEADER_RULES } from '../build-cloudflare.mjs';
import { geoRedirect } from '../lib/geo-redirect.mjs';

const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const B = 'https://x.test';
const req = (path, country, ua = 'Mozilla/5.0 Safari') => {
  const r = new Request(B + path, { headers: { 'user-agent': ua } });
  Object.defineProperty(r, 'cf', { value: { country } });
  return r;
};
const target = (path, country, ua) => geoRedirect(req(path, country, ua))?.headers.get('location') ?? null;

test('cloudflare geo redirect mirrors middleware.js', () => {
  for (const c of ['DE', 'AT', 'CH', 'US', 'CA', 'MX']) assert.equal(target('/', c), null, c);
  assert.equal(target('/', 'TR'), B + '/tr/');
  assert.equal(target('/verlauf', 'TR'), B + '/tr/verlauf');
  assert.equal(target('/', 'GB'), B + '/en-eu/');
  assert.equal(target('/verlauf?a=1', 'FR'), B + '/en-eu/verlauf?a=1');
  assert.equal(target('/?market=de', 'GB'), null);
  assert.equal(target('/?market=us', 'TR'), null);
  assert.equal(target('/', 'GB', 'Googlebot/2.1'), null);
  assert.equal(target('/datenschutz', 'GB'), null);
  assert.equal(target('/', ''), B + '/en-eu/');
  assert.equal(geoRedirect(req('/', 'GB')).status, 302);
});

test('toPatterns converts vercel regex sources', () => {
  assert.deepEqual(toPatterns('/(.*)'), ['/*']);
  assert.deepEqual(toPatterns('/sw.js'), ['/sw.js']);
  assert.deepEqual(toPatterns('/(banner\\.png|fonts/.+)'), ['/banner.png', '/fonts/*']);
});

test('_headers keeps every vercel header and stays within the Pages limit', () => {
  const file = buildHeadersFile(vercel);
  const rules = file.split('\n').filter(l => l.startsWith('/'));
  assert.ok(rules.length <= MAX_HEADER_RULES, `${rules.length} rules`);
  const global = vercel.headers.find(r => r.source === '/(.*)');
  for (const h of global.headers.filter(h => h.key !== 'Cache-Control')) {
    assert.ok(file.includes(`  ${h.key}: ${h.value}\n`), h.key);
  }
  assert.ok(file.includes('Content-Security-Policy: default-src \'none\''));
  assert.ok(file.includes('/sw.js\n  Cache-Control: no-cache, no-store, must-revalidate\n  Service-Worker-Allowed: /'));
  assert.ok(file.includes('/fonts/*\n  Cache-Control: public, max-age=31536000, immutable'));
  assert.ok(!/^\/\*\n(?:  .+\n)*  Cache-Control/m.test(file), 'no global Cache-Control (would be merged with specific rules)');
  assert.ok(!file.includes('X-Robots-Tag'));
});

test('noindex flag adds X-Robots-Tag only to the global rule', () => {
  const file = buildHeadersFile(vercel, { noindex: true });
  assert.equal(file.split('X-Robots-Tag').length - 1, 1);
  assert.match(file, /^\/\*\n(?:  .+\n)*  X-Robots-Tag: noindex, nofollow, noarchive$/m);
});

test('functions are limited to the two geo routes', () => {
  assert.deepEqual(fs.readdirSync(new URL('../functions', import.meta.url)).sort(), ['index.js', 'verlauf.js']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { toPatterns, buildHeadersFile, MAX_HEADER_RULES } from '../build-cloudflare.mjs';
import { geoRedirect, handleGeoRequest } from '../lib/geo-redirect.mjs';

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
  for (const h of global.headers.filter(h => h.key !== 'Cache-Control' && h.key !== 'Strict-Transport-Security')) {
    assert.ok(file.includes(`  ${h.key}: ${h.value}\n`), h.key);
  }
  assert.match(file, /^  Strict-Transport-Security: max-age=300$/m);
  assert.doesNotMatch(file, /includeSubDomains|preload/i);
  assert.ok(file.includes('Content-Security-Policy: default-src \'none\''));
  assert.ok(file.includes('/sw.js\n  Cache-Control: no-cache, no-store, must-revalidate\n  Service-Worker-Allowed: /'));
  assert.ok(file.includes('/fonts/*\n  Cache-Control: public, max-age=31536000, immutable'));
  assert.ok(!/^\/\*\n(?:  .+\n)*  Cache-Control/m.test(file), 'no global Cache-Control (would be merged with specific rules)');
  assert.match(file, /https:\/\/evspendpure\.pages\.dev\/\*\n  X-Robots-Tag: noindex, nofollow, noarchive/);
  assert.match(file, /https:\/\/evspendpure-cf-test\.pages\.dev\/\*\n  X-Robots-Tag: noindex, nofollow, noarchive/);
});

test('noindex flag adds X-Robots-Tag only to the global rule', () => {
  const file = buildHeadersFile(vercel, { noindex: true });
  assert.equal(file.split('X-Robots-Tag').length - 1, 1);
  assert.match(file, /^\/\*\n(?:  .+\n)*  X-Robots-Tag: noindex, nofollow, noarchive$/m);
});

test('functions are limited to the two geo routes', () => {
  assert.deepEqual(fs.readdirSync(new URL('../functions', import.meta.url)).sort(), ['index.js', 'verlauf.js']);
});


test('function responses preserve status, body and headers with host-aware noindex', async () => {
  for (const host of ['evspendpure.pages.dev', 'x.evspendpure.pages.dev', 'evspendpure-cf-test.pages.dev', 'preview.evspendpure-cf-test.pages.dev', 'www.evspendpure.com']) {
    for (const path of ['/', '/verlauf']) {
      for (const country of ['DE', 'TR', 'FR']) {
        const request = new Request('https://' + host + path + '?id=42');
        Object.defineProperty(request, 'cf', { value: { country } });
        const response = await handleGeoRequest({ request, env: {}, next: async () => new Response('body', { headers: { 'Content-Security-Policy': "default-src 'none'", 'Cache-Control': 'no-store' } }) });
        assert.equal(response.headers.has('X-Robots-Tag'), host.endsWith('.pages.dev'), host);
        if (country === 'DE') {
          assert.equal(response.status, 200);
          assert.equal(response.headers.get('Content-Security-Policy'), "default-src 'none'");
          assert.equal(response.headers.get('Cache-Control'), 'no-store');
          assert.equal(await response.text(), 'body');
        } else {
          assert.equal(response.status, 302);
          assert.ok(response.headers.get('Location').endsWith(path === '/' ? '/?id=42' : '/verlauf?id=42'));
        }
      }
    }
  }
});

test('global noindex runtime flag covers function and avoids suffix spoofing', async () => {
  for (const [host, flag, expected] of [['www.evspendpure.com','1',true], ['www.evspendpure.com','0',false], ['fakepages.dev','0',false], ['pages.dev.attacker.test','0',false], ['preview.evspendpure.pages.dev','0',true]]) {
    const request = new Request('https://' + host + '/?market=de');
    const response = await handleGeoRequest({ request, env: { CF_NOINDEX: flag }, next: async () => new Response('ok', { headers: { 'X-Frame-Options': 'DENY' } }) });
    assert.equal(response.headers.has('X-Robots-Tag'), expected);
    assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
  }
});

test('geo function redirects keep the existing security policy and indexing rules', async () => {
  const { onRequest: start } = await import('../functions/index.js');
  const { onRequest: history } = await import('../functions/verlauf.js');
  const globalHeaders = vercel.headers.find(rule => rule.source === '/(.*)').headers;
  const value = name => globalHeaders.find(header => header.key === name).value;
  for (const [path, fn] of [['/', start], ['/verlauf', history]]) {
    for (const host of ['www.evspendpure.com', 'evspendpure.pages.dev', 'cf-index-03-preview.evspendpure.pages.dev', '0f5716bd.evspendpure.pages.dev']) {
      for (const flag of ['0', '1']) {
        for (const [country, prefix] of [['FR', '/en-eu'], ['TR', '/tr']]) {
          const request = new Request(`https://${host}${path}?id=probe&x=2`);
          Object.defineProperty(request, 'cf', { value: { country } });
          const response = await fn({ request, env: { CF_NOINDEX: flag }, next: () => { throw Error('unexpected pass-through'); } });
          assert.equal(response.status, 302);
          assert.equal(response.headers.get('location'), `https://${host}${prefix}${path}?id=probe&x=2`);
          assert.equal(response.headers.get('strict-transport-security'), 'max-age=300');
          assert.equal(response.headers.get('referrer-policy'), value('Referrer-Policy'));
          assert.equal(response.headers.get('x-content-type-options'), value('X-Content-Type-Options'));
          assert.equal(response.headers.get('cache-control'), null);
          assert.equal(response.headers.get('x-robots-tag'), flag === '1' || host.endsWith('.pages.dev') ? 'noindex, nofollow, noarchive' : null);
          assert.equal([...response.headers].filter(([name]) => name === 'x-robots-tag').length, flag === '1' || host.endsWith('.pages.dev') ? 1 : 0);
        }
      }
    }
  }
});

test('HTTP redirect does not introduce HSTS', () => {
  const request = new Request('http://www.evspendpure.com/verlauf?id=42');
  Object.defineProperty(request, 'cf', { value: { country: 'TR' } });
  const response = geoRedirect(request);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'http://www.evspendpure.com/tr/verlauf?id=42');
  assert.equal(response.headers.get('strict-transport-security'), null);
});

test('pass-through retains HTML, error, and caching headers on known and unknown paths', async () => {
  for (const path of ['/', '/verlauf', '/unknown']) {
    for (const status of [200, 404, 503]) {
      for (const [host, flag] of [['evspendpure.pages.dev', '0'], ['www.evspendpure.com', '1'], ['www.evspendpure.com', '0']]) {
        const request = new Request(`https://${host}${path}?market=de`);
        const headers = { 'Content-Security-Policy': "default-src 'none'; script-src 'self'", 'Cache-Control': 'private, max-age=0', 'Strict-Transport-Security': 'max-age=3600', 'X-Robots-Tag': 'noarchive' };
        const response = await handleGeoRequest({ request, env: { CF_NOINDEX: flag }, next: async () => new Response('test', { status, headers }) });
        assert.equal(response.status, status);
        assert.equal(await response.text(), 'test');
        for (const name of ['Content-Security-Policy', 'Cache-Control', 'Strict-Transport-Security']) {
          assert.equal(response.headers.get(name), headers[name]);
        }
        assert.equal(response.headers.get('X-Robots-Tag'), host.endsWith('.pages.dev') || flag === '1' ? 'noindex, nofollow, noarchive' : 'noarchive');
      }
    }
  }
});


test('Cloudflare HSTS is consistent across static builds and both geo functions', async () => {
  for (const noindex of [false, true]) {
    const headers = buildHeadersFile(vercel, { noindex });
    const global = headers.split('\n\n').find(block => block.startsWith('/*\n'));
    assert.match(global, /^  Strict-Transport-Security: max-age=300$/m);
    assert.equal((global.match(/^  Strict-Transport-Security:/gm) || []).length, 1);
    assert.doesNotMatch(global, /includeSubDomains|preload/i);
  }
  assert.equal(vercel.headers.find(rule => rule.source === '/(.*)').headers.find(h => h.key === 'Strict-Transport-Security').value, 'max-age=63072000; includeSubDomains; preload');
});

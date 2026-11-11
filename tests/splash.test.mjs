// Regression tests for the EVSpendPure start splash (restored after it was removed together with
// the sessionStorage marker in c99b1ec). The splash must exist on the three start pages, behave as
// originally designed, and must never touch browser storage.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const START_PAGES = ['index.html', 'en-eu/index.html', 'tr/index.html'];
const OTHER_PAGES = ['verlauf.html', 'en-eu/verlauf.html', 'tr/verlauf.html'];
const block = html => html.match(/<div id="evspend-splash"[\s\S]*?<\/svg>\s*<\/div>/)?.[0];

const script = read('script.js');
const lifecycle = (() => {
  const a = script.indexOf('(function initEvspendSplash() {');
  const b = script.indexOf('// ── Utilities');
  assert.ok(a > -1 && b > a, 'splash lifecycle present in script.js');
  return script.slice(a, b);
})();

test('SPL-01 Splash-Markup steht auf allen drei Startseiten, genau einmal, vor dem App-Inhalt', () => {
  for (const f of START_PAGES) {
    const html = read(f);
    assert.equal(html.match(/id="evspend-splash"/g)?.length, 1, f);
    assert.ok(html.indexOf('id="evspend-splash"') < html.indexOf('id="sliderAnnouncer"'), f);
    assert.match(html, /class="evspend-splash"[^>]*aria-hidden="true"/, f);
  }
  for (const f of OTHER_PAGES) assert.doesNotMatch(read(f), /evspend-splash/, f);
});

test('SPL-02 Das Logo im Splash ist in DE, EN und TR byte-gleich und entspricht dem Lizenzinventar', async () => {
  const [de, en, tr] = START_PAGES.map(f => block(read(f)));
  assert.ok(de && de === en && de === tr);
  assert.equal(de.match(/<svg\b/g).length, 1);
  assert.doesNotMatch(de, /<text|font-family|<image|href=/);
  const { inventory } = await import('../build-licenses.mjs');
  assert.equal(inventory().svgFingerprint, JSON.parse(read('vendor/license-inventory.json')).release.svgFingerprint);
});

test('SPL-03 CSS: Ablauf, Fallback nach 4 s und reduzierte Bewegung sind vorhanden (Quelle und minifiziert)', () => {
  for (const f of ['styles-app.css', 'styles-app.min.css']) {
    const css = read(f);
    assert.match(css, /\.evspend-splash\.run/, f);
    assert.match(css, /evsReveal/, f);
    assert.match(css, /evspendSplashFallback/, f);
    assert.match(css, /4e3ms|4000ms|ease-in 4s/, f);
    assert.match(css, /prefers-reduced-motion/, f);
  }
});

test('SPL-04 Der minifizierte Bundle enthaelt den Splash-Ablauf und keinen Speicher-Merker', () => {
  const min = read('script.min.js');
  assert.match(min, /evspend-splash/);
  assert.match(min, /evspend:native-splash-hidden/);
  assert.doesNotMatch(min, /evspendSplashSeen/);
  assert.doesNotMatch(lifecycle.replace(/\/\/.*$/gm, ''), /sessionStorage|localStorage|indexedDB|document\.cookie/);
});

test('SPL-05 Native Splash-Freigabe (SplashScreen.hide + Ereignis) bleibt unveraendert', () => {
  assert.match(script, /splash\.hide\(\{ fadeOutDuration: 0 \}\)/);
  assert.match(script, /evspend:native-splash-hidden/);
});

// ---- behavioural scenarios -----------------------------------------------------------------
function run({ referrer = '', navType = 'navigate', reduced = false, native = false } = {}) {
  const timers = []; let now = 0; const classes = new Set(); const attrs = {}; const listeners = {};
  const el = {
    classList: { add: c => classes.add(c) }, setAttribute: (k, v) => { attrs[k] = v; },
    style: {}, parentNode: { removeChild: () => { el.parentNode = null; } },
    addEventListener: (t, fn) => { (listeners[t] ||= []).push(fn); }
  };
  const storageUse = [];
  const trap = name => new Proxy({}, { get: (_, p) => { storageUse.push(`${name}.${String(p)}`); return () => null; } });
  const wl = {};
  const win = {
    requestAnimationFrame: cb => timers.push({ at: now, cb }),
    matchMedia: () => ({ matches: reduced }),
    performance: { getEntriesByType: () => [{ type: navType }] },
    addEventListener: (t, fn) => { (wl[t] ||= []).push(fn); },
    Capacitor: native ? { isNativePlatform: () => true } : undefined
  };
  const ctx = {
    window: win, document: { getElementById: () => el, referrer },
    location: { protocol: 'https:', host: 'www.evspendpure.com' },
    performance: win.performance, URL, sessionStorage: trap('sessionStorage'), localStorage: trap('localStorage'),
    setTimeout: (cb, d) => { timers.push({ at: now + (d || 0), cb }); return timers.length; },
    clearTimeout: id => { if (timers[id - 1]) timers[id - 1].cb = null; },
    requestAnimationFrame: win.requestAnimationFrame, matchMedia: win.matchMedia
  };
  vm.runInNewContext(lifecycle, ctx);
  const advance = ms => { const end = now + ms; for (;;) {
    const next = timers.filter(t => t.cb && t.at <= end).sort((a, b) => a.at - b.at)[0];
    if (!next) break; now = next.at; const cb = next.cb; next.cb = null; cb(); } now = end; };
  return { el, classes, attrs, listeners, wl, advance, storageUse, get detached() { return el.parentNode === null; } };
}

test('SPL-06 Erststart im Browser: Splash laeuft (.run), blendet nach ~1 s aus und wird entfernt', () => {
  const s = run();
  s.advance(50); assert.ok(s.classes.has('run')); assert.ok(!s.classes.has('is-hidden'));
  s.advance(1000); assert.ok(s.classes.has('is-hidden'));
  s.advance(400); assert.ok(s.detached);
  assert.deepEqual(s.storageUse, []);
});

test('SPL-07 Erneuter App-Start (kalter Start, kein Referrer) zeigt den Splash wieder, ohne Speicher', () => {
  for (let i = 0; i < 2; i++) { const s = run(); s.advance(50); assert.ok(s.classes.has('run')); assert.deepEqual(s.storageUse, []); }
});

test('SPL-08 Interne Navigation (gleiche Herkunft) und Neuladen zeigen keinen Splash', () => {
  for (const o of [{ referrer: 'https://www.evspendpure.com/verlauf.html' }, { navType: 'reload' }]) {
    const s = run(o); assert.ok(s.classes.has('is-hidden')); assert.equal(s.el.style.display, 'none'); assert.ok(!s.classes.has('run'));
    assert.deepEqual(s.storageUse, []);
  }
  const ext = run({ referrer: 'https://example.org/' }); ext.advance(50); assert.ok(ext.classes.has('run'));
});

test('SPL-09 Reduzierte Bewegung entfernt den Splash sofort', () => {
  const s = run({ reduced: true }); assert.ok(s.classes.has('is-hidden')); assert.ok(!s.classes.has('run'));
});

test('SPL-10 Native App: Start erst nach nativer Freigabe, spaetestens nach 3 s; Sicherheits-Timeout 1,8 s', () => {
  const a = run({ native: true }); a.advance(500); assert.ok(!a.classes.has('run'));
  a.wl['evspend:native-splash-hidden'][0](); a.advance(50); assert.ok(a.classes.has('run'));
  a.advance(1800); assert.ok(a.classes.has('is-hidden'));
  const b = run({ native: true }); b.advance(3050); assert.ok(b.classes.has('run'));
  b.advance(1900); assert.ok(b.classes.has('is-hidden'));
});

test('SPL-11 Tippen beendet den Splash sofort', () => {
  const s = run(); s.advance(50); s.listeners.click[0](); assert.ok(s.classes.has('is-hidden'));
});

test('SPL-12 Ein Fehler im Splash-Code blockiert die App nicht', () => {
  const ctx = { document: { getElementById: () => { throw new Error('boom'); } }, window: {} };
  assert.doesNotThrow(() => vm.runInNewContext(lifecycle, ctx));
});

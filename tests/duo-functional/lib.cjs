// Gemeinsame Hilfen fuer die funktionalen Browser Tests der Web Duo Ansicht (Chromium via Playwright).
// Kein Teil von npm test (braucht einen Browser). Aufruf und Umgebung: siehe DUO_LAYOUT.md, Abschnitt Testaufrufe.
//   PLAYWRIGHT_MODULE  Pfad oder Name des playwright Moduls (Standard: "playwright" aus node_modules)
//   CHROMIUM_PATH      optional: Chromium Programm (Standard: der von Playwright installierte Browser)
//   CHROMIUM_ARGS      optional: zusaetzliche Argumente, Leerzeichen getrennt (zum Beispiel --no-sandbox, wenn der Lauf als root erfolgt)
// Der Server liefert das Repo Wurzelverzeichnis auf 127.0.0.1 (freier Port) und bildet Vercel cleanUrls nach.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', ico: 'image/x-icon', webmanifest: 'application/manifest+json', txt: 'text/plain', xml: 'application/xml' };
exports.ROOT = ROOT;
exports.BASE = null;
let server = null;
exports.startServer = () => new Promise(resolve => {
  server = http.createServer((rq, rs) => {
    const p = decodeURIComponent(rq.url.split('?')[0]);
    const cands = [p];
    if (p.endsWith('/')) cands.unshift(p + 'index.html'); else cands.push(p + '.html');
    for (const c of cands) {
      const f = path.join(ROOT, c);
      if (!f.startsWith(ROOT)) continue;
      if (fs.existsSync(f) && fs.statSync(f).isFile()) {
        const h = { 'Content-Type': MIME[f.split('.').pop()] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
        if (c === '/sw.js') h['Service-Worker-Allowed'] = '/';
        rs.writeHead(200, h); return rs.end(fs.readFileSync(f));
      }
    }
    rs.writeHead(404, { 'Content-Type': 'text/plain' }); rs.end('404');
  }).listen(0, '127.0.0.1', () => { exports.BASE = 'http://127.0.0.1:' + server.address().port; resolve(exports.BASE); });
});

let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch (e) {
  console.error('playwright nicht gefunden. Installieren (ausserhalb des Repos oder mit --no-save): npm i --no-save playwright, danach npx playwright install chromium. Oder PLAYWRIGHT_MODULE setzen.');
  process.exit(2);
}
exports.launch = () => chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: process.env.CHROMIUM_ARGS ? process.env.CHROMIUM_ARGS.split(' ').filter(Boolean) : []
});

// Ergebnis Zaehler. Exit Code 1, sobald eine Pruefung FAIL meldet.
const tally = { pass: 0, fail: 0, info: 0 };
exports.tally = tally;
exports.P = (ok, name, info) => {
  tally[ok === null ? 'info' : ok ? 'pass' : 'fail']++;
  console.log((ok === null ? 'INFO' : ok ? 'PASS' : 'FAIL') + ' ' + name + (info !== undefined ? ' | ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''));
};
exports.run = fn => (async () => {
  await exports.startServer();
  const b = await exports.launch();
  let crashed = false;
  try { await fn(b); } catch (e) { crashed = true; console.log('FATAL ' + (e && e.stack || e)); }
  await b.close(); server.close();
  console.log(`ERGEBNIS ${tally.pass} PASS, ${tally.fail} FAIL, ${tally.info} INFO`);
  process.exit(crashed || tally.fail > 0 || tally.pass === 0 ? 1 : 0);
})();

const PAGES = { de: ['/', 'de', 'de', 'EUR'], en: ['/en-eu/', 'eu', 'en', 'EUR'], tr: ['/tr/', 'tr', 'tr', 'TRY'] };
exports.PAGES = PAGES;
// Oeffnet die echte Web Seite. profile: touch (isMobile, hasTouch: pointer coarse, hover none) oder mouse (ohne Touch).
// duo:false ersetzt styles-duo.min.css durch eine leere Datei (Vergleichszustand ohne Duo CSS). sw:true erlaubt den Service Worker.
exports.open = async function (b, o) {
  const prof = o.profile || 'touch';
  const lang = o.lang || 'de', [url, mk, lg, cur] = PAGES[lang];
  const ctx = await b.newContext({ viewport: { width: o.w, height: o.h }, deviceScaleFactor: 1, hasTouch: prof !== 'mouse', isMobile: prof === 'touch', locale: { de: 'de-DE', en: 'en-IE', tr: 'tr-TR' }[lang], colorScheme: o.dark ? 'dark' : 'light', reducedMotion: 'reduce', serviceWorkers: o.sw ? 'allow' : 'block' });
  const p = await ctx.newPage();
  const log = { console: [], pageerror: [], failed: [] };
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) log.console.push(m.type() + ': ' + m.text().slice(0, 160)); });
  p.on('pageerror', e => log.pageerror.push(String(e).slice(0, 160)));
  p.on('requestfailed', r => log.failed.push(r.url()));
  p.on('response', r => { if (r.status() >= 400) log.failed.push(r.status() + ' ' + r.url()); });
  if (o.duo === false) await p.route(/styles-duo\.min\.css/, route => route.fulfill({ status: 200, contentType: 'text/css', body: '/* none */' }));
  if (!o.noSeed) await p.addInitScript(([mk, lg, cur]) => { try { if (!localStorage.getItem('eaf.market')) { localStorage.setItem('eaf.market', mk); localStorage.setItem('eaf.language', lg); localStorage.setItem('eaf.currency', cur); } localStorage.setItem('evs_splash_seen', '1'); } catch (e) {} }, [mk, lg, cur]);
  await p.goto(exports.BASE + (o.url || url), { waitUntil: 'networkidle' });
  await p.waitForTimeout(o.wait || 1200);
  await p.evaluate(() => { document.querySelectorAll('[class*="splash"],#splash').forEach(e => e.style.display = 'none'); });
  if (o.dark) await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  if (o.single) { await p.click('#modeSingleBtn'); await p.waitForTimeout(250); }
  if (o.vb) { await p.click('#typeVbBtn'); await p.waitForTimeout(250); }
  await p.evaluate(() => { for (const e of [document.documentElement, document.body, document.querySelector('.result-section')]) if (e) e.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); });
  await p.waitForTimeout(250);
  return { ctx, p, log, b };
};
exports.cdp = async x => { x.cdp = x.cdp || await x.ctx.newCDPSession(x.p); return x.cdp; };
exports.tap = async (x, px, py) => { const c = await exports.cdp(x); await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: px, y: py }] }); await x.p.waitForTimeout(40); await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await x.p.waitForTimeout(350); };
exports.swipe = async (x, px, py, dy, dx = 0, n = 12) => {
  const c = await exports.cdp(x), p = x.p;
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: px, y: py }] });
  for (let i = 1; i <= n; i++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: px + dx * i / n, y: py + dy * i / n }] }); await p.waitForTimeout(16); }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(450);
};
exports.rect = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
exports.twoCol = p => p.evaluate(() => { const m = document.querySelector('.app-main'), rs = document.querySelector('.result-section'), c = document.querySelector('.calc-section'); const cs = getComputedStyle(m); const R = e => e.getBoundingClientRect(); return cs.display === 'grid' && cs.gridTemplateColumns.split(' ').length === 2 && R(rs).left >= R(c).right - 1; });
exports.mq = p => p.evaluate(() => { const m = q => matchMedia(q).matches; return { coarse: m('(pointer:coarse)'), fine: m('(pointer:fine)'), hoverNone: m('(hover:none)'), anyCoarse: m('(any-pointer:coarse)'), gate: m('screen and (min-width: 840px) and (min-height: 480px) and (pointer: coarse) and (hover: none)') }; });
exports.hscroll = p => p.evaluate(() => { const de = document.documentElement; return de.scrollWidth > de.clientWidth + 0.5 || document.body.scrollWidth > de.clientWidth + 0.5; });
exports.state = p => p.evaluate(() => { const r = document.querySelector('.result-section'); return { sy: Math.round(scrollY), rs: Math.round(r.scrollTop), max: Math.round(r.scrollHeight - r.clientHeight), ch: r.clientHeight }; });

// Gemeinsame Messhilfen der Suiten
exports.ls = p => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
exports.txt = (p, id) => p.evaluate(i => { const e = document.getElementById(i); return e ? e.textContent.trim().replace(/\s+/g, ' ') : null; }, id);
exports.results = p => p.evaluate(() => { const t = i => { const e = document.getElementById(i); return e ? e.textContent.trim().replace(/\s+/g, ' ') : null; }; return [t('compareHeroVal'), t('singleHeroVal'), t('compareResult'), t('singleResult')]; });
exports.setInputs = async (p, vals) => { await p.evaluate(v => { for (const [i, x] of Object.entries(v)) { const e = document.getElementById(i); if (e) { e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } } }, vals); };

// Layout Fingerabdruck aller sichtbaren Elemente (Seitenkoordinaten) und Vergleich mit Toleranz
exports.fp=p=>p.evaluate(()=>{const o=[];for(const e of document.body.querySelectorAll('*')){const cs=getComputedStyle(e);if(cs.display==='none')continue;const r=e.getBoundingClientRect();o.push([Math.round(r.left*10)/10,Math.round((r.top+scrollY)*10)/10,Math.round(r.width*10)/10,Math.round(r.height*10)/10].join(','))}return o.join('|')});
exports.fpEq=(a,b,tol=1)=>{const A=a.split('|'),B=b.split('|');if(A.length!==B.length)return false;for(let i=0;i<A.length;i++){const p=A[i].split(',').map(Number),q=B[i].split(',').map(Number);for(let j=0;j<4;j++)if(Math.abs(p[j]-q[j])>tol)return false}return true};
exports.settle=async p=>{let ok=0;for(let i=0;i<40&&ok<4;i++){const y=await p.evaluate(()=>{window.scrollTo({top:0,behavior:'instant'});return scrollY});ok=y===0?ok+1:0;await p.waitForTimeout(150);}};

// Residual Grok findings only. All storage belongs to isolated synthetic profiles.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/hakanguer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const base=process.env.LIVE_BASE||'http://127.0.0.1:8786';
const out=process.env.LIVE_OUT||'/private/tmp/evspend-live-rest-20261018';
const executablePath=process.env.CHROMIUM_PATH||'/Users/hakanguer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const checks=[],errors=[];
function check(name,actual,expected){assert.deepEqual(actual,expected,name);checks.push({name,pass:true});}
const cfg={de:['EUR','€','de-DE','/'],eu:['EUR','€','en-IE','/en-eu/'],us:['USD','$','en-US','/'],tr:['TRY','₺','tr-TR','/tr/']};
const historyPath=m=>m==='tr'?'/tr/verlauf':m==='eu'?'/en-eu/verlauf':'/verlauf';
function record(m,j){const [code,symbol,locale]=cfg[m],us=m==='us',km=us?1200*1.609344:m==='tr'?1000:333,consumption=us?100*3.785411784/(26*1.609344):m==='tr'?7:8.3,price=us?3.2/3.785411784:m==='tr'?63:1.79,costPer100=consumption*price,monthlyCost=costPer100*km/100;return{schema:'v2',id:'eaf_'+String(j).padStart(32,'0'),date:Date.now()-j,type:'vb',km,consumption,price,costPer100,monthlyCost,yearlyCost:monthlyCost*12,marketCode:m,language:m==='tr'?'tr':m==='de'?'de':'en',sourceLocale:locale,currencyMetadata:{code,symbol,locale},ridesharing:false,persons:1,note:'İstanbul; Größe "cost" 🌿'};}
const rows=['de','eu','us','us','tr','tr'].map((m,j)=>record(m,j+1)),raw=JSON.stringify(rows);
function observe(p){p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());}
async function assertRows(p,m){
 const titles=await p.locator('#histList .hist-item-body').allTextContents();
 check(m+' six rows',titles.length,6);
 check(m+' DE title EUR km',titles.some(t=>t.includes('49,47')&&t.includes('333 km')&&t.includes('€')&&t.includes('1,79')),true);
 check(m+' US title USD mi mpg gal',titles.filter(t=>t.includes('$147.69')&&t.includes('1,200 mi')&&t.includes('26 mpg')&&t.includes('$3.20 / gal')).length,2);
 check(m+' TR title TRY km L',titles.filter(t=>t.includes('₺4.410,00')&&t.includes('1.000 km')&&t.includes('₺63,00 / L')).length,2);
 check(m+' no TR gallons',titles.some(t=>t.includes('₺')&&t.includes('gal')),false);
 check(m+' all storage bytes unchanged',await p.evaluate(()=>localStorage.getItem('eautofakten_history')),raw);
}
async function exportFile(p,id){const event=p.waitForEvent('download');await p.locator(id).click();const dl=await event;return fs.readFileSync(await dl.path(),'utf8');}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath});
 for(const m of Object.keys(cfg)){
  const c=await browser.newContext({locale:cfg[m][2],serviceWorkers:'block'}),p=await c.newPage();observe(p);
  await p.goto(base+cfg[m][3]);await p.evaluate(({m,raw})=>{localStorage.setItem('eaf.market',m);localStorage.setItem('eaf.verlauf.period','all');localStorage.setItem('eautofakten_history',raw);},{m,raw});
  await p.goto(base+historyPath(m));await assertRows(p,m);
  check(m+' statistic denominator',await p.locator('#statCount').textContent(),m==='de'?'2 von 6':m==='tr'?'6 kayıttan 2':'2 of 6');
  check(m+' foreign currency caveat',/4/.test(await p.locator('#statsMixCaveat').textContent()),true);
  check(m+' no unknown origin warning for complete metadata',/unbekannt|Unknown source|Kaynak pazar/.test(await p.locator('#histList').textContent()),false);
  const theme=p.locator('#themeBtn');check(m+' history theme title',await theme.getAttribute('title'),m==='de'?'Hell / Dunkel':m==='tr'?'Açık / Koyu':'Light / Dark');check(m+' history theme aria',await theme.getAttribute('aria-label'),m==='de'?'Farbschema wechseln':m==='tr'?'Temayı değiştir':'Toggle theme');
  await theme.click();check(m+' history theme title after toggle',await theme.getAttribute('title'),m==='de'?'Hell / Dunkel':m==='tr'?'Açık / Koyu':'Light / Dark');
  if(m==='tr')check('TR average uses Ort.',(await p.locator('[data-i18n="statsAvgCostPer100"]').first().textContent()).startsWith('Ort.'),true);
  const csv=await exportFile(p,'#histCsvExportBtn');fs.writeFileSync(path.join(out,'mixed-'+m+'.csv'),csv);
  check(m+' CSV explicit unit columns',csv.split('\r\n')[0].split(';').length,16);check(m+' CSV no annual assumption',/12x|year|Jahr|Yıl/i.test(csv.split('\r\n')[0]),false);check(m+' CSV Unicode retained',csv.includes('İstanbul; Größe ""cost"" 🌿'),true);
  if(m==='eu')check('EU history British metric spelling',await p.evaluate(()=>document.getElementById('chartCaption').textContent.includes('kilometres')),true);
  const backup=JSON.parse(await exportFile(p,'#histExportBtn'));check(m+' JSON raw complete',backup.entries,rows);
  await p.reload();await assertRows(p,m);
  await p.goto(base+cfg[m][3]);
  for(const language of ['de','en','tr']){
   await p.evaluate(l=>EAF_I18N.setLanguage(l),language);
   check(m+'/'+language+' theme tooltip',await theme.getAttribute('title'),language==='de'?'Hell / Dunkel':language==='tr'?'Açık / Koyu':'Light / Dark');
   check(m+'/'+language+' theme aria',await theme.getAttribute('aria-label'),language==='de'?'Farbschema wechseln':language==='tr'?'Temayı değiştir':'Toggle theme');
   await p.evaluate(m=>{setMode('single');setType('ev');const value=m==='tr'?3.4:m==='us'?.18:.42;document.getElementById('strompreis').value=value;document.getElementById('strompreis').dispatchEvent(new Event('input',{bubbles:true}));},m);
   const price=await p.evaluate(()=>_fmtMoney(_getSingleData().price)+'/kWh');check(m+'/'+language+' actual price chip',await p.locator('#singleMeta span').last().textContent(),price);
   await p.locator('#themeBtn').click();check(m+'/'+language+' aria after theme toggle',await theme.getAttribute('aria-label'),language==='de'?'Farbschema wechseln':language==='tr'?'Temayı değiştir':'Toggle theme');
   if(language==='tr')check(m+' Turkish document title',(await p.title()).includes('Elektrik ve yakıt maliyeti'),true);
  }
  await c.close();
 }
 // Unknown provenance stays explicit, and is excluded separately from foreign currencies.
 {
  const c=await browser.newContext({locale:'de-DE',serviceWorkers:'block'}),p=await c.newPage();observe(p);await p.goto(base+'/');
  const unknown={...record('de',7)};delete unknown.marketCode;delete unknown.currencyMetadata;delete unknown.sourceLocale;delete unknown.language;
  await p.evaluate(v=>{localStorage.setItem('eautofakten_history',JSON.stringify(v));localStorage.setItem('eaf.verlauf.period','all');},[...rows,unknown]);await p.goto(base+'/verlauf');
  check('unknown currency explicitly shown',(await p.locator('#histList').textContent()).includes('Währung unbekannt'),true);
  check('unknown origin explicitly shown',(await p.locator('#histList').textContent()).includes('Herkunftsmarkt unbekannt'),true);
  check('foreign and unknown exclusions separated',(await p.locator('#statsMixCaveat').textContent()).includes('4 Einträge')&&(await p.locator('#statsMixCaveat').textContent()).includes('1 Eintrag mit unbekannter'),true);
  check('unknown currency denominator',await p.locator('#statCount').textContent(),'2 von 7');
  await p.evaluate(row=>localStorage.setItem('eautofakten_history',JSON.stringify([row])),rows[2]);await p.reload();
  check('foreign-only total unavailable',await p.locator('#statVbTotal').textContent(),'—');
  check('foreign-only chart explains excluded currency',await p.locator('.chart-hint-title').textContent(),'Keine Einträge in dieser Währung');
  check('foreign-only row preserved',(await p.locator('#histList').textContent()).includes('$147.69'),true);
  await c.close();
 }
 await browser.close();
 // A separate disk profile proves cache update and browser-process restart offline.
 const userDataDir=fs.mkdtempSync(path.join(out,'offline-profile-'));
 let c=await chromium.launchPersistentContext(userDataDir,{headless:true,executablePath,locale:'de-DE',acceptDownloads:true});let p=await c.newPage();observe(p);
 await p.goto(base+'/');await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await p.evaluate(raw=>{localStorage.setItem('eautofakten_history',raw);localStorage.setItem('eaf.verlauf.period','all');localStorage.setItem('eaf.market','de');},raw);
 await p.goto(base+'/verlauf');await assertRows(p,'cached before restart');
 const version=fs.readFileSync(path.join(process.cwd(),'sw.js'),'utf8').match(/const CACHE_VERSION\s*=\s*'([^']+)'/)[1];
 check('new service worker cache generation',await p.evaluate(v=>caches.keys().then(keys=>keys.includes('evspend-static-'+v)),version),true);
 await c.close();c=await chromium.launchPersistentContext(userDataDir,{headless:true,executablePath,locale:'de-DE',offline:true,acceptDownloads:true});p=await c.newPage();observe(p);
 await p.goto(base+'/verlauf');await assertRows(p,'offline after process restart');
 check('offline JSON export exact',JSON.parse(await exportFile(p,'#histExportBtn')).entries,rows);
 await p.goto(base+'/');check('offline calculator available',await p.locator('#compareHeroVal').isVisible(),true);await c.close();
 check('JavaScript exceptions',errors,[]);
 fs.writeFileSync(path.join(out,'live-browser.json'),JSON.stringify({checks:checks.length,results:checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,pass:true}));
})().catch(e=>{fs.writeFileSync(path.join(out,'live-browser.json'),JSON.stringify({checks,errors,error:e.stack},null,2));console.error(e);process.exit(1);});

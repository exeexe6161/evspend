// Uses the already installed audit browser runtime; no product dependency.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/hakanguer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const base=process.env.GROK_BASE || 'http://127.0.0.1:8766';
const out=process.env.GROK_OUT || '/private/tmp/evspend-grok/browser-results.json';
const results=[],errors=[];let seq=100;
function check(name,actual,expected,tol=0){const pass=tol?Number.isFinite(actual)&&Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)):JSON.stringify(actual)===JSON.stringify(expected);results.push({name,actual,expected,pass});}
const close=(name,a,e)=>check(name,a,e,1e-10);
const profiles={de:{locale:'de-DE',path:'/',currency:'EUR'},eu:{locale:'en-GB',path:'/en-eu/',currency:'EUR'},us:{locale:'en-US',path:'/',currency:'USD'},tr:{locale:'tr-TR',path:'/tr/',currency:'TRY'}};
const envelope=entries=>({app:'evspend',kind:'history-export',schemaVersion:1,entries});
function row(m,km=1250,cost=6.475){return{schema:'v2',id:'eaf_'+(++seq).toString(16).padStart(32,'0'),date:Date.now()-seq,type:'ev',km,consumption:17.5,price:cost/17.5,costPer100:cost,monthlyCost:cost*km/100,yearlyCost:cost*km*12/100,persons:1,ridesharing:false,note:'synthetic audit',marketCode:m,language:m==='de'?'de':m==='tr'?'tr':'en',sourceLocale:m==='eu'?'en-IE':profiles[m].locale,currencyMetadata:{code:profiles[m].currency,symbol:m==='tr'?'₺':m==='us'?'$':'€',locale:m==='eu'?'en-IE':profiles[m].locale}};}
async function set(p,values){await p.evaluate(values=>{for(const[id,value]of Object.entries(values)){const el=document.getElementById(id);el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));}calc();},values);}
async function snapshot(p){return p.evaluate(()=>({single:_getSingleData(),compare:_getCompareData(),longterm:_getLongtermSummary(_getCompareData()),kmMonat,longtermPremium,market:EAF_I18N.getMarketCode(),range:_kmToDist(computeRange(n('batteryKwh'),n('evVerbrauch'))),charge:computeFullChargeCost(n('batteryKwh'),n('strompreis')),share:buildShareTextCompare(_getCompareData())}));}
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/Users/hakanguer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
async function pageFor(m,storage={},serviceWorkers='block'){
 const c=await browser.newContext({locale:profiles[m].locale,serviceWorkers,viewport:{width:390,height:844},reducedMotion:'reduce'});
 if(Object.keys(storage).length)await c.addInitScript(data=>{if(!sessionStorage.getItem('auditSeed')){for(const[k,v]of Object.entries(data))localStorage.setItem(k,v);sessionStorage.setItem('auditSeed','1');}},storage);
 const p=await c.newPage();p.on('pageerror',e=>errors.push({market:m,message:e.message}));p.on('dialog',d=>d.accept());await p.goto(base+profiles[m].path);await p.waitForTimeout(150);return{p,c};
}
for(const m of Object.keys(profiles)){
 const {p,c}=await pageFor(m);let s=await snapshot(p);
 const defaults=m==='us'?[.16,3.2,26,30,600,75,5500]:m==='tr'?[3.4,63,7,17,1000,60,250000]:m==='eu'?[.3,1.7,6.5,17,1000,60,5000]:[.37,1.85,7,17,1000,60,5000];
 const init=await p.evaluate(()=>['strompreis','benzinpreis','verbrauchVerbrenner','evVerbrauch','kmShared','batteryKwh','longtermPremium'].map(id=>Number(document.getElementById(id).value)));
 check(m+' B01 defaults',init,defaults);check(m+' B11 monthly state/slider',await p.locator('#kmMonat').inputValue(),String(s.kmMonat));
 check(m+' mobile no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 check(m+' B05 immediate initial result',await p.locator('#compareHeroVal').textContent(),await p.evaluate(()=>_fmtMoney(Math.abs(_compareDifferenceForDisplay(_getCompareData())))));
 if(m==='us')check('B36 English legal links',(await p.locator('a[data-i18n="footerDatenschutz"]').getAttribute('href')),'/datenschutz.en.html');
 const vals=m==='us'?{kmEv:120,evVerbrauch:28,strompreis:.18}:m==='tr'?{kmEv:200,evVerbrauch:17,strompreis:3.4}:{kmEv:123,evVerbrauch:16.5,strompreis:.42};
 await p.evaluate(()=>{setMode('single');setType('ev')});await set(p,vals);s=await snapshot(p);close(m+' EV independent',s.single.totalCost,m==='us'?6.048:m==='tr'?115.6:8.5239);
 await p.evaluate(n=>{setRideshareActive(true);setRidesharePersons(n)},m==='us'?3:m==='tr'?2:4);s=await snapshot(p);close(m+' rideshare',s.single.costPerPerson,m==='us'?2.016:m==='tr'?57.8:2.130975);
 await p.evaluate(()=>{setRideshareActive(false);setType('vb')});await set(p,m==='us'?{kmVb:250,verbrauchVerbrenner:32,benzinpreis:3.45}:m==='tr'?{kmVb:150,verbrauchVerbrenner:7,benzinpreis:63}:{kmVb:333,verbrauchVerbrenner:8.3,benzinpreis:1.79});s=await snapshot(p);close(m+' ICE independent',s.single.totalCost,m==='us'?26.953125:m==='tr'?661.5:49.47381);
 await p.evaluate(()=>setMode('compare'));
 await set(p,m==='us'?{kmShared:1200,evVerbrauch:30,strompreis:.16,verbrauchVerbrenner:26,benzinpreis:3.2,batteryKwh:75}:m==='tr'?{kmShared:1000,evVerbrauch:17,strompreis:3.4,verbrauchVerbrenner:7,benzinpreis:63,batteryKwh:60}:{kmShared:2500,evVerbrauch:18,strompreis:.4,verbrauchVerbrenner:6.5,benzinpreis:1.75,batteryKwh:77});
 s=await snapshot(p);close(m+' compare EV',s.compare.eAutoTotal,m==='us'?57.6:m==='tr'?578:180);close(m+' compare ICE',s.compare.verbrennerTotal,m==='us'?1200/26*3.2:m==='tr'?4410:284.375);close(m+' range',s.range,m==='us'?250:m==='tr'?6000/17:7700/18);close(m+' charge',s.charge,m==='us'?12:m==='tr'?204:30.8);
 await p.evaluate(m=>{setKmMonat(m==='de'||m==='eu'?1500:1000);setLongtermYears(m==='de'||m==='eu'?8:10);setLongtermPremium(m==='us'?5500:m==='tr'?250000:6000);setLongtermActive(true)},m);
 s=await snapshot(p);close(m+' longterm EV',s.longterm.evEnergyCost,m==='us'?5760:m==='tr'?69360:10368);close(m+' longterm ICE',s.longterm.fuelCost,m==='us'?120000/26*3.2:m==='tr'?529200:16380);close(m+' longterm net',s.longterm.netDifference,m==='us'?120000/26*3.2-11260:m==='tr'?209840:12);
 if(m==='de'||m==='eu'){await p.evaluate(()=>setLongtermYears(5));s=await snapshot(p);close(m+' 5 years net',s.longterm.netDifference,-2242.5);await p.evaluate(()=>setLongtermYears(0));s=await snapshot(p);close(m+' zero years net',s.longterm.netDifference,-6000);}
 await p.evaluate(()=>{setLongtermYears(10);setLongtermPremium(0)});check(m+' B17 savings visible',await p.locator('#ltBlockDone').evaluate(e=>!e.hidden),true);
 await p.screenshot({path:out.replace('.json','-'+m+'.png'),fullPage:true});await c.close();
}
// Explicit switches, cancellation and saved-history integrity.
for(const from of Object.keys(profiles))for(const to of Object.keys(profiles)){if(from===to)continue;
 const saved=JSON.stringify([row(from)]),{p,c}=await pageFor(from,{'eautofakten_history':saved});await set(p,{strompreis:from==='tr'?4.5:.45});
 const compatible=[from,to].every(x=>x==='de'||x==='eu');let dialogs=0;
 p.removeAllListeners('dialog');p.on('dialog',d=>{dialogs++;d.dismiss()});await p.locator('#marketSwitch').click();await p.locator('[data-market="'+to+'"]').click();await p.waitForTimeout(100);
 if(!compatible){check(from+'→'+to+' cancelled market',await p.evaluate(()=>EAF_I18N.getMarketCode()),from);check(from+'→'+to+' warning',dialogs,1);p.removeAllListeners('dialog');p.on('dialog',d=>d.accept());await p.locator('#marketSwitch').click();await p.locator('[data-market="'+to+'"]').click();await p.waitForTimeout(150);}
 check(from+'→'+to+' accepted market',await p.evaluate(()=>EAF_I18N.getMarketCode()),to);
 check(from+'→'+to+' route',new URL(p.url()).pathname,profiles[to].path);
 close(from+'→'+to+' price',Number(await p.locator('#strompreis').inputValue()),compatible?.45:to==='tr'?3.4:to==='us'?.16:to==='eu'?.3:.37);
 check(from+'→'+to+' history unchanged',await p.evaluate(()=>localStorage.getItem('eautofakten_history')),saved);
 await p.reload();check(from+'→'+to+' reload market',await p.evaluate(()=>EAF_I18N.getMarketCode()),to);await c.close();
}
for(const m of Object.keys(profiles)){
 const {p,c}=await pageFor(m);await p.goto(base+(m==='tr'?'/tr/verlauf.html':m==='eu'?'/en-eu/verlauf.html':'/verlauf.html'));
 const e=row(m,m==='us'?1250*1.609344:1250),raw=envelope([e]);await p.locator('#histImportInput').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(raw))});await p.waitForTimeout(100);
 check(m+' import count',await p.locator('#histList .hist-item-body').count(),1);
 const downloaded=p.waitForEvent('download');await p.locator('#histExportBtn').click();const dl=await downloaded;const json=JSON.parse(fs.readFileSync(await dl.path()));check(m+' export exact km',json.entries[0].km,e.km);
 await p.locator('#histList .hist-item-body').first().click();await p.waitForTimeout(150);let s=await snapshot(p);close(m+' 1250 restored',s.single.km,e.km);close(m+' restore cost',s.single.totalCost,e.monthlyCost);await p.reload();s=await snapshot(p);close(m+' 1250 reload',s.single.km,e.km);await p.locator('#qSaveBtn').click();await p.waitForTimeout(100);check(m+' resave count',await p.evaluate(()=>JSON.parse(localStorage.getItem('eautofakten_history')).length),2);close(m+' resave 1250',await p.evaluate(()=>JSON.parse(localStorage.getItem('eautofakten_history'))[0].km),e.km);await c.close();
}
// CSS display rules must not override the zero-distance judgement state.
{
 const {p,c}=await pageFor('de');await set(p,{kmShared:0});
 check('B12 zero distance badge actually hidden',await p.locator('#compareBadge').evaluate(e=>getComputedStyle(e).display),'none');
 await set(p,{kmShared:100});check('B12 positive distance badge restored',await p.locator('#compareBadge').evaluate(e=>getComputedStyle(e).display!=='none'),true);await c.close();
}
// Visible weighted stats and currency in the real chart accessibility table.
{
 const rows=[row('de',10,5),row('de',490,10),row('us',100,6)],raw=JSON.stringify(rows),{p,c}=await pageFor('de',{'eautofakten_history':raw,'eaf.verlauf.period':'all'});
 await p.goto(base+'/verlauf.html');
 check('B07 weighted visible statistic',await p.locator('#statEvAvgCost').textContent(),'9,90\u00a0€');
 check('B08 visible cents',await p.locator('#statEvTotal').textContent(),'49,50\u00a0€');
 check('B09 lead-currency count',await p.locator('#statEvN').textContent(),'2 Einträge');
 check('B04 no history mutation during mixed rendering',await p.evaluate(()=>localStorage.getItem('eautofakten_history')),raw);
 await c.close();
}
{
 const raw=JSON.stringify([row('us',100,6)]),{p,c}=await pageFor('de',{'eautofakten_history':raw,'eaf.verlauf.period':'all'});await p.goto(base+'/verlauf.html');
 check('N01 accessible chart follows USD entry currency',(await p.locator('#chartCaption').textContent()).includes('US-Dollar'),true);
 check('N01 accessible table uses dollar',(await p.locator('#chartDataTableBody').textContent()).includes('$'),true);await c.close();
}
for(const m of Object.keys(profiles)){
 const {p,c}=await pageFor(m,{'eaf.longtermKmMonat':'1234.5','eaf.longtermPremium':'1050'});
 check(m+' B22 restored monthly exact',await p.locator('#kmMonat').inputValue(),'1234.5');
 check(m+' B41 restored premium exact',await p.locator('#longtermPremium').inputValue(),'1050');
 await p.evaluate(()=>setLongtermPremium(1050));close(m+' B41 accepted premium exact',(await snapshot(p)).longtermPremium,1050);
 check(m+' B39 accessible settings language',await p.locator('.top-controls').getAttribute('aria-label'),m==='de'?'Einstellungen':m==='tr'?'Ayarlar':'Settings');await c.close();
}
// Original loss paths: capacity rejection is atomic, and oversized legacy remains at its source.
{
 const rows=Array.from({length:50},()=>row('de',100)),raw=JSON.stringify(rows),{p,c}=await pageFor('de',{'eautofakten_history':raw});
 await p.evaluate(()=>setMode('single'));await p.locator('#noteInput').fill('preserve capacity note');await p.locator('#qSaveBtn').click();await p.waitForTimeout(100);
 check('DATA_LOSS_FIX_1 full save preserves all entries',await p.evaluate(()=>localStorage.getItem('eautofakten_history')),raw);
 check('DATA_LOSS_FIX_1 unsaved note preserved',await p.locator('#noteInput').inputValue(),'preserve capacity note');
 await p.goto(base+'/verlauf.html');await p.locator('#histImportInput').setInputFiles({name:'over-capacity.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(envelope([row('de',123)])))});await p.waitForTimeout(100);
 check('DATA_LOSS_FIX_2 import overflow is atomic',await p.evaluate(()=>localStorage.getItem('eautofakten_history')),raw);await c.close();
}
{
 const legacy=JSON.stringify(Array.from({length:51},(_,i)=>({id:1700000000000+i,inputs:{km_per_month:1250,ev_consumption:17.5,electricity_price:.37,fuel_consumption:7,fuel_price:1.85},results:{}})));
 const {p,c}=await pageFor('de',{'eaf.appVersion':'20260428-1','eaf.history.v1':legacy});await p.waitForTimeout(100);
 check('DATA_LOSS_FIX_3 legacy 51 source preserved',await p.evaluate(()=>localStorage.getItem('eaf.history.v1')),legacy);
 check('DATA_LOSS_FIX_3 no partial migrated history',await p.evaluate(()=>localStorage.getItem('eautofakten_history')),null);await c.close();
}
// A history market selection must never relabel the saved calculator inputs.
{
 const {p,c}=await pageFor('us');await set(p,{strompreis:.18});const raw=JSON.stringify([row('us')]);await p.evaluate(raw=>localStorage.setItem('eautofakten_history',raw),raw);await p.goto(base+'/verlauf.html');
 await p.locator('#marketSwitch').click();await p.locator('[data-market="tr"]').click();await p.waitForTimeout(100);
 check('history switch own route',new URL(p.url()).pathname,'/tr/verlauf');
 await p.goto(base+'/tr/');close('history US→TR calculator default',Number(await p.locator('#strompreis').inputValue()),3.4);close('history US→TR premium default',(await snapshot(p)).longtermPremium,250000);
 check('history switch original entries preserved',await p.evaluate(()=>localStorage.getItem('eautofakten_history')),raw);await c.close();
}
// US history opened directly, with no market preference, uses US units.
{const c=await browser.newContext({locale:'en-US',serviceWorkers:'block'}),p=await c.newPage();await p.goto(base+'/verlauf.html');check('B03 direct US history label',await p.locator('#marketSwitchLabel').textContent(),'US · $');await c.close();}
check('browser page errors',errors,[]);await browser.close();fs.writeFileSync(out,JSON.stringify({base,checks:results.length,pass:results.filter(x=>x.pass).length,results,errors},null,2));console.log(JSON.stringify({checks:results.length,failed:results.filter(x=>!x.pass),errors}));if(results.some(x=>!x.pass))process.exitCode=1;
})().catch(e=>{fs.writeFileSync(out,JSON.stringify({results,errors,error:e.stack},null,2));console.error(e);process.exit(1)});

// Targeted product decisions only. Uses the existing installed browser runtime.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/Users/hakanguer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const out=process.env.PRODUCT_OUT || '/private/tmp/evspend-final-product/product-browser.json';
const base=process.env.PRODUCT_BASE || 'http://127.0.0.1:8766';
const results=[],errors=[];
const check=(name,actual,expected)=>results.push({name,actual,expected,pass:JSON.stringify(actual)===JSON.stringify(expected)});
const locales={de:'de-DE',eu:'en-IE',us:'en-US',tr:'tr-TR'};
const paths={de:'/',eu:'/en-eu/',us:'/',tr:'/tr/'};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/Users/hakanguer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});
 for(const market of Object.keys(locales))for(const language of ['de','en','tr']){
  const label=market+'/'+language;
  const context=await browser.newContext({locale:locales[market],serviceWorkers:'block',viewport:{width:390,height:844}});
  await context.addInitScript(m=>{localStorage.setItem('eaf.market',m);localStorage.setItem('eautofakten_history','[]');},market);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(label+': '+e.message));
  await page.goto(base+paths[market]);
  await page.evaluate(lang=>window.EAF_I18N.setLanguage(lang),language);
  check(label+' B05 initial result visible',await page.locator('#compareHeroVal').evaluate(e=>e.textContent.trim()!==''&&e.textContent!=='—'),true);
  check(label+' B42 example hint visible',await page.locator('[data-i18n="exampleValuesHint"]').isVisible(),true);
  // Real input events without calling calc or clicking the result button.
  await page.evaluate(m=>{
   for(const[id,v]of Object.entries({kmShared:1000,evVerbrauch:20,strompreis:m==='tr'?4:.5,verbrauchVerbrenner:m==='us'?25:6,benzinpreis:m==='tr'?60:m==='us'?3:2})){
    const e=document.getElementById(id);e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));
   }
  },market);
  const money=await page.evaluate(()=>({currency:_currentCurrencyFormat().code,locale:_currentCurrencyFormat().locale}));
  const formatted=(value,decimals=2)=>new Intl.NumberFormat(money.locale,{style:'currency',currency:money.currency,minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(value);
  check(label+' B05 automatic independent difference',await page.locator('#compareHeroVal').textContent(),formatted(market==='tr'?2800:20));
  check(label+' B05 no stale state',await page.evaluate(()=>document.body.hasAttribute('data-result-stale')),false);
  check(label+' history unchanged after calculation',await page.evaluate(()=>localStorage.getItem('eautofakten_history')),'[]');
  check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(language==='en')check(label+' B25 consumption unit label',await page.locator('[data-i18n="labelIceConsumption"]').textContent(),market==='us'?'Fuel economy':'Fuel consumption');
  if(language==='de')check(label+' B37 localized description',await page.locator('[data-i18n="heroSubtitle1"]').textContent(),'Strom und Kraftstoffkosten berechnen');
  if(language==='tr'){
   check(label+' B26 combustion label',await page.locator('#typeVbBtn').textContent(),'İçten yanmalı araç');
   check(label+' B31 rideshare label',await page.locator('[data-i18n="rideshareLabel"]').textContent(),'Ortak yolculuk');
  }
  await page.locator('label:has(#longtermToggle)').click();
  await page.evaluate(m=>{for(const[id,v]of Object.entries({kmMonat:1000,longtermYears:10,longtermPremium:m==='tr'?100000:1000})){const e=document.getElementById(id);e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));}},market);
  const lt=await page.locator('#ltBlockDone').textContent();
  check(label+' B18 period wording',lt.includes(language==='de'?'Ende des Zeitraums':language==='en'?'end of the period':'Dönem sonunda'),true);
  check(label+' longterm automatic independent net advantage',lt.includes(formatted(market==='tr'?236000:1400,0)),true);
  if(language==='tr'){
   check(label+' B27 break-even translated',await page.locator('#longtermBody').textContent().then(t=>t.includes('başabaş noktası')),true);
   check(label+' B28 annual distance natural',await page.locator('#longtermBody').textContent().then(t=>t.includes('Yılda yaklaşık')),true);
  }
  await page.locator('label:has(#longtermToggle)').click();
  const rendered=await page.evaluate(()=>{
   setRideshareActive(true);setRidesharePersons(3);
   const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;
   const ctx=canvas.getContext('2d'),texts=[],fill=ctx.fillText.bind(ctx);
   ctx.fillText=(text,...args)=>{texts.push(String(text));return fill(text,...args);};
   _drawCompare9x16(ctx,_getCompareData());
   return{sentence:_resultSentence(_getCompareData(),'compare','share'),texts};
  });
  check(label+' B16 no adjacent parenthesis groups',/\)\s*\(/.test(rendered.sentence),false);
  check(label+' B16 count retained',rendered.sentence.includes('3'),true);
  check(label+' B16 sentence actually rendered',rendered.texts.includes(rendered.sentence),true);
  check(label+' B16 qualifier retained',rendered.sentence.includes(language==='de'?'pro Person':language==='en'?'per person':'kişi başı'),true);
  if(market==='de'){await page.waitForTimeout(650);await page.screenshot({path:out.replace('.json','-'+language+'.png'),fullPage:true});}
  await context.close();
 }
 // Renamed Turkish history terms must remain searchable without rewriting data.
 {
  const context=await browser.newContext({locale:'tr-TR',serviceWorkers:'block',viewport:{width:390,height:844}});
  const raw=JSON.stringify([{schema:'v2',id:'eaf_1234567890abcdef1234567890abcdef',date:Date.now(),type:'vb',km:1250,consumption:7,price:63,costPer100:441,monthlyCost:5512.5,yearlyCost:66150,persons:1,ridesharing:false,note:'synthetic product check',marketCode:'tr',language:'tr',sourceLocale:'tr-TR',currencyMetadata:{code:'TRY',symbol:'₺',locale:'tr-TR'}}]);
  await context.addInitScript(raw=>{localStorage.setItem('eaf.market','tr');localStorage.setItem('eaf.verlauf.period','all');localStorage.setItem('eautofakten_history',raw);},raw);
  const page=await context.newPage();page.on('pageerror',e=>errors.push('TR history: '+e.message));
  await page.goto(base+'/tr/verlauf.html');
  check('B30 visible history heading',await page.locator('[data-i18n="entriesHeader"]').textContent(),'Kayıtlar');
  check('B30 search placeholder',await page.locator('#searchInput').getAttribute('placeholder'),'Kayıt ara…');
  check('B26 history combustion label',(await page.locator('#histList').textContent()).includes('İçten yanmalı araç'),true);
  for(const term of ['İçten yanmalı','içten yanmalı','benzinli']){
   await page.locator('#searchInput').fill(term);await page.waitForTimeout(400);
   check('B26 search alias '+term,await page.locator('#histList .hist-item-body').count(),1);
  }
  check('B30 label/search keeps stored 1250 km record unchanged',await page.evaluate(()=>localStorage.getItem('eautofakten_history')),raw);
  await context.close();
 }
 check('browser exceptions',errors,[]);await browser.close();
 const failed=results.filter(r=>!r.pass);fs.writeFileSync(out,JSON.stringify({checks:results.length,passed:results.length-failed.length,results,errors},null,2));
 console.log(JSON.stringify({checks:results.length,failed,errors}));if(failed.length)process.exitCode=1;
})().catch(e=>{fs.writeFileSync(out,JSON.stringify({results,errors,error:e.stack},null,2));console.error(e);process.exit(1);});

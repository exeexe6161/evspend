import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ready,historyRuntime,entry,historyKey} from './history-runtime.mjs';
const text = el => [el.textContent || '', ...(el.children || []).map(text)].join(' ');
const profiles = {de:['EUR','€','de-DE'],eu:['EUR','€','en-IE'],us:['USD','$','en-US'],tr:['TRY','₺','tr-TR']};
function record(m,type='vb') {
 const [code,symbol,locale]=profiles[m];
 const km=m==='us'?1200*1.609344:1000;
 const consumption=m==='us'?100*3.785411784/(26*1.609344):7;
 const price=m==='us'?3.2/3.785411784:m==='tr'?63:1.85;
 const costPer100=consumption*price,monthlyCost=costPer100*km/100;
 return entry({type,km,consumption,price,costPer100,monthlyCost,yearlyCost:monthlyCost*12,marketCode:m,sourceLocale:locale,language:m==='tr'?'tr':m==='de'?'de':'en',currencyMetadata:{code,symbol,locale},note:'İstanbul; Größe "cost" 🌿'});
}
for(const market of Object.keys(profiles))test(`Live B04 ${market}: every row keeps original units, amounts and source formatting across reload`,()=>{
 const records=Object.keys(profiles).map(m=>record(m));const raw=JSON.stringify(records);
 for(let reload=0;reload<2;reload++){
  const rt=historyRuntime({storage:{'eaf.market':market,[historyKey]:raw}});
  const rows=rt.elements.get('histList').children.map(text);
  assert.equal(rows.length,4);
  const us=rows.find(s=>s.includes('$'));
  assert.match(us,/1,200 mi/);assert.match(us,/26 mpg/);assert.match(us,/\$3\.20 \/ gal/);assert.match(us,/\$147\.69/);
  const tr=rows.find(s=>s.includes('₺'));
  assert.match(tr,/1\.000 km/);assert.match(tr,/₺63,00 \/ L/);assert.doesNotMatch(tr,/gal|mpg| mi/);
  const eur=rows.filter(s=>s.includes('€'));assert.equal(eur.length,2);for(const row of eur)assert.match(row,/km/);
  assert.ok(eur.some(s=>s.includes('1.000 km')));assert.ok(eur.some(s=>s.includes('1,000 km')));
  assert.equal(rt.storage.get(historyKey),raw);
 }
});
for(const market of Object.keys(profiles))test(`Live B09 ${market}: compatible currency only, denominator includes all six records`,()=>{
 const records=['de','eu','us','us','tr','tr'].map(m=>record(m));const raw=JSON.stringify(records);
 const rt=historyRuntime({storage:{'eaf.market':market,[historyKey]:raw}});
 const expected=market==='us'?295.38461538461536:market==='tr'?8820:259;
 assert.equal(rt.elements.get('statCount').textContent,market==='tr'?'6 kayıttan 2':market==='de'?'2 von 6':'2 of 6');
 assert.match(rt.elements.get('statVbN').textContent,market==='tr'?/6 kayıttan 2/:market==='de'?/2 von 6/:/2 of 6/);
 const [currency,,locale]=profiles[market];assert.equal(rt.elements.get('statVbTotal').textContent,new Intl.NumberFormat(locale,{style:'currency',currency}).format(expected));
 assert.equal(rt.storage.get(historyKey),raw);
});
for(const market of Object.keys(profiles))test(`Live B04 ${market}: missing origin uses stable canonical units and explicitly unknown currency`,()=>{
 const unknown=entry({km:100,consumption:18,price:.3,costPer100:5.4,monthlyCost:5.4,yearlyCost:64.8,marketCode:undefined,language:undefined,currencyMetadata:undefined,sourceLocale:undefined});
 const rt=historyRuntime({storage:{'eaf.market':market,[historyKey]:JSON.stringify([unknown])}});
 const row=text(rt.elements.get('histList'));
 assert.match(row,/100 km/);assert.doesNotMatch(row,/€|₺|\$|gal| mi/);
 assert.match(row,/unbekannt|Unknown|bilinmiyor/);
 assert.equal(rt.elements.get('statEvTotal').textContent,'—');
 assert.equal(JSON.parse(rt.context.window.EAF_HISTORY_EXPORT.json().data).entries[0].yearlyCost,64.8);
});
for(const [sourceLocale,code,symbol,units]of [['en-US','USD','$','mi'],['tr-TR','TRY','₺','km'],['en-IE','EUR','€','km']])test(`Live B04 sourceLocale fallback ${sourceLocale} is independent of selected market`,()=>{
 const e=entry({marketCode:undefined,currencyMetadata:undefined,sourceLocale});
 const rt=historyRuntime({storage:{'eaf.market':'de',[historyKey]:JSON.stringify([e])}});
 const row=text(rt.elements.get('histList'));assert.ok(row.includes(symbol));assert.ok(row.includes(units));
 const cells=rt.context.window.EAF_HISTORY_EXPORT.csv().data.split('\r\n')[1].split(';');assert.equal(cells[12],code);
});
test('Live B04 contradictory saved metadata stays explicit and does not mutate storage',()=>{
 const e=record('us');e.marketCode='de';const raw=JSON.stringify([e]);
 const rt=historyRuntime({storage:{'eaf.market':'tr',[historyKey]:raw}});
 assert.match(text(rt.elements.get('histList')),/Kaynak pazar bilinmiyor/);
 assert.equal(rt.storage.get(historyKey),raw);
});
for(const market of Object.keys(profiles))test(`Live B10/B13 ${market}: mixed CSV has per-row units, translated types, stored trip results, no assumed annual column`,()=>{
 const records=['de','eu','us','tr'].map(m=>record(m));records[0].note='simple';records[1].note='simple';records[2].note='simple';records[3].note='simple';
 const raw=JSON.stringify(records),rt=historyRuntime({storage:{'eaf.market':market,[historyKey]:raw}});
 const csv=rt.context.window.EAF_HISTORY_EXPORT.csv().data,lines=csv.split('\r\n');
 assert.equal(lines[0].split(';').length,16);assert.doesNotMatch(lines[0],/12x|year|Jahr|Yıl/i);
 const decimal=market==='de'||market==='tr'?',':'.';const num=s=>Number(s.replace(decimal,'.'));
 for(let j=0;j<4;j++){
  const cells=lines[j+1].split(';'),m=records[j].marketCode;assert.equal(cells.length,16);assert.notEqual(cells[1],'vb');
  assert.equal(cells[3],m==='us'?'mi':'km');assert.equal(cells[5],m==='us'?'mpg':'L/100 km');
  assert.equal(cells[7],profiles[m][0]+'/'+(m==='us'?'gal':'L'));assert.equal(cells[9],profiles[m][0]+'/100 '+cells[3]);
  assert.equal(cells[12],profiles[m][0]);assert.equal(cells[13],m);
  assert.ok(Math.abs(num(cells[10])-records[j].monthlyCost)<.0051);
  if(m==='us'){assert.equal(num(cells[2]),1200);assert.equal(num(cells[4]),26);assert.equal(num(cells[6]),3.2);assert.equal(num(cells[10]),147.69);}
 }
 assert.equal(rt.storage.get(historyKey),raw);
 assert.equal(JSON.stringify(JSON.parse(rt.context.window.EAF_HISTORY_EXPORT.json().data).entries),raw);
});
for(const market of Object.keys(profiles))test(`Live B24/B35 ${market}: single detail price uses the existing monetary formatter`,()=>{
 const rt=ready({storage:{'eaf.market':market}});(rt.element || rt.addElement)('singleMeta');
 rt.setInputs({kmEv:market==='us'?120:123,evVerbrauch:market==='us'?28:16.5,strompreis:market==='tr'?3.4:market==='us'?.18:.42});
 rt.run('singleType="ev";longtermActive=false;calcSingle()');
 // VM helper does not retain innerHTML. Currency identity and rounding remain shared.
 assert.equal(rt.run('_fmtMoney(_getSingleData().price)'),new Intl.NumberFormat(profiles[market][2],{style:'currency',currency:profiles[market][0]}).format(market==='tr'?3.4:market==='us'?.18:.42));
 const data=rt.run('_getSingleData()');assert.ok(Number.isFinite(data.totalCost));
});
test('Live B14/B29/B37: operational text and route wording are consistent',()=>{
 const rt=ready();rt.run("window.EAF_I18N.setLanguage('tr')");assert.match(rt.run('document.title'),/Elektrik ve yakıt/);assert.equal(rt.run("_t('toastCalcFirst')"),'Önce hesaplama yap.');
 rt.run("window.EAF_I18N.setLanguage('de')");
 for(const key of ['sentenceCompareSavings','shareCompareSavings','sentenceCompareExtra','shareCompareExtra'])assert.match(rt.run(`_t('${key}',{val:'10 €',km:'100 km'})`),/für 100 km/);
});

test('Live B45/B46: limited date and punctuation corrections are present',()=>{
 const read=rel=>fs.readFileSync(new URL("../"+rel,import.meta.url),'utf8');
 assert.match(read('en-eu/barrierefreiheit.html'),/entered into force in June 2019 and became applicable on June 28, 2025/);
 for(const page of ['hinweise.en.html','en-eu/hinweise.html']){assert.match(read(page),/market statistics; entering/);assert.doesNotMatch(read(page),/market statistics, entering/);}
 assert.match(read('hinweise.tr.html'),/istatistiği değildir, her/); // Valid Turkish sentence coordination is preserved.
});

for(const [m,distance,consumption,price,total,formatted]of [['de',123,16.5,.42,8.5239,'8,52 €'],['eu',123,16.5,.42,8.5239,'€8.52'],['us',120,28,.18,6.048,'$6.05'],['tr',200,17,3.4,115.6,'₺115,60']])test(`Live exact reference ${m}: EV display and CSV keep raw result with original-market units`,()=>{
 const rt=ready({storage:{'eaf.market':m}});rt.setInputs({kmEv:distance,evVerbrauch:consumption,strompreis:price});
 const d=rt.run('singleType="ev";longtermActive=false;_getSingleData()');assert.ok(Math.abs(d.totalCost-total)<1e-12);
 assert.equal(rt.run('_fmtMoney(_getSingleData().totalCost)'),formatted);
 const [code,symbol,locale]=profiles[m],us=m==='us';
 const e=entry({type:'ev',km:us?distance*1.609344:distance,consumption:us?consumption/1.609344:consumption,price,costPer100:us?consumption/1.609344*price:consumption*price,monthlyCost:total,yearlyCost:total*12,marketCode:m,currencyMetadata:{code,symbol,locale},sourceLocale:locale,note:'reference'});
 const h=historyRuntime({storage:{'eaf.market':'de',[historyKey]:JSON.stringify([e])}}),cells=h.context.window.EAF_HISTORY_EXPORT.csv().data.split('\r\n')[1].split(';');
 assert.equal(Number(cells[2].replace(',','.')),distance);assert.equal(Number(cells[4].replace(',','.')),consumption);
 assert.equal(cells[5],us?'kWh/100 mi':'kWh/100 km');assert.equal(cells[7],code+'/kWh');
 assert.ok(Math.abs(Number(cells[10].replace(',','.'))-total)<=.005);
 assert.equal(JSON.parse(h.context.window.EAF_HISTORY_EXPORT.json().data).entries[0].monthlyCost,total);
});
for(const [m,km,ev,ep,vb,vp,expected]of [['de',2500,18,.4,6.5,1.75,['180,00 €','284,38 €','104,38 €']],['us',1200,30,.16,26,3.2,['$57.60','$147.69','$90.09']],['tr',1000,17,3.4,7,63,['₺578,00','₺4.410,00','₺3.832,00']]])test(`Live exact reference ${m}: comparison uses preserved cent rounding`,()=>{
 const rt=ready({storage:{'eaf.market':m}});rt.setInputs({kmShared:km,evVerbrauch:ev,strompreis:ep,verbrauchVerbrenner:vb,benzinpreis:vp});
 const actual=rt.run('longtermActive=false;[_getCompareData().eAutoTotal,_getCompareData().verbrennerTotal,_compareDifferenceForDisplay(_getCompareData())].map(v=>_fmtMoney(v))');
 assert.deepEqual(Array.from(actual),expected);
});

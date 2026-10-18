import test from 'node:test';
import assert from 'node:assert/strict';
import {ready, historyRuntime, entry, historyKey} from './history-runtime.mjs';
import {distanceRuntime} from './distance-runtime.mjs';
const close=(a,e)=>assert.ok(Math.abs(a-e)<1e-10*Math.max(1,Math.abs(e)),`${a} != ${e}`);
for(const [market,price,fuel,cons,premium] of [['de',.37,1.85,7,5000],['eu',.30,1.70,6.5,5000],['us',.16,3.20,26,5500],['tr',3.40,63,7,250000]]) {
 test(`B01 ${market}: first visit uses existing market defaults without touching history`,()=>{
  const rt=ready({storage:{'eaf.market':market}}),before=rt.storage.get(historyKey);
  close(Number(rt.elements.get('strompreis').value),price);
  close(Number(rt.elements.get('benzinpreis').value),fuel);
  close(Number(rt.elements.get('verbrauchVerbrenner').value),cons);
  close(rt.run('longtermPremium'),premium);
  assert.equal(rt.storage.get(historyKey),before);
 });
 test(`B22 ${market}: longterm bounds preserve valid off-grid values`,()=>{
  const rt=distanceRuntime(market,{'eaf.longtermKmMonat':'1234.5','eaf.longtermPremium':'1050'});
  close(rt.run('kmMonat'),1234.5);close(rt.run('longtermPremium'),1050);
  const huge=distanceRuntime(market,{'eaf.longtermKmMonat':'99999','eaf.longtermPremium':'99999999'});
  close(huge.run('kmMonat'),market==='us'?3100:5000);
  close(huge.run('longtermPremium'),market==='tr'?2000000:market==='us'?45000:40000);
 });
}
test('B02: cancelled incompatible switch leaves inputs, history, preferences unchanged',()=>{
 const rt=distanceRuntime('de');rt.setInputs({strompreis:.45});rt.run('saveInputs()');
 const before=Object.fromEntries(rt.storage);rt.context.confirm=()=>false;
 assert.equal(rt.run("window.EAF_I18N.setMarket('tr')"),false);
 assert.deepEqual(Object.fromEntries(rt.storage),before);assert.equal(rt.run("window.EAF_I18N.getMarketCode()"),'de');
});
test('B02: saved inputs carry unit provenance across history market selection',()=>{
 const saved=JSON.stringify({_marketCode:'us',kmEv:'120',strompreis:'.18',evVerbrauch:'28'});
 const rt=ready({storage:{'eaf.market':'eu','eaf.inputs.v2':saved,'eaf.longtermPremium':'5500'}});
 close(Number(rt.elements.get('strompreis').value),.30);close(Number(rt.elements.get('evVerbrauch').value),17);
 close(rt.run('longtermPremium'),5000);
});
test('B07/B08/B09: weighted statistic, cent precision, lead currency count and no mutation',()=>{
 const rows=[entry({id:'a',km:10,costPer100:5,monthlyCost:.5}),entry({id:'b',km:490,costPer100:10,monthlyCost:49}),entry({id:'c',marketCode:'us',currencyMetadata:{code:'USD',symbol:'$',locale:'en-US'}})];
 const raw=JSON.stringify(rows),rt=historyRuntime({storage:{[historyKey]:raw}});
 assert.equal(rt.elements.get('statEvAvgCost').textContent,'9,90 €');
 assert.equal(rt.elements.get('statEvTotal').textContent,'49,50 €');
 assert.equal(rt.elements.get('statEvN').textContent,'2 Einträge');
 assert.equal(rt.storage.get(historyKey),raw);
});
test('B06/B17: no premium renders operating advantage; zero years and losses stay correct',()=>{
 const rt=ready();for(const id of ['longtermWrap','ltBlockLoss','ltBlockDone','ltLossVal','ltDoneVal','ltEvTotal','ltVbTotal','ltBreakeven'])rt.element(id);
 rt.run('appMode="compare"; longtermActive=true; longtermYears=10; longtermPremium=0; renderLongterm({yrEv:714,yrVb:1554})');
 assert.equal(rt.elements.get('ltBlockDone').hidden,false);assert.match(rt.elements.get('ltDoneVal').textContent,/8.400/);
 rt.run('renderLongterm({yrEv:1554,yrVb:714})');assert.equal(rt.elements.get('ltBlockLoss').hidden,false);assert.match(rt.elements.get('ltLossVal').textContent,/8.400/);
 rt.run('longtermPremium=5000; renderLongterm({yrEv:714,yrVb:1554})');assert.match(rt.elements.get('ltBreakeven').textContent,/6,0 Jahren/);
 rt.run('longtermYears=0; longtermPremium=6000; renderLongterm({yrEv:714,yrVb:1554})');assert.match(rt.elements.get('ltLossVal').textContent,/6.000/);
});
test('B15/B24: share comparison names direction and per-person difference with formatted money',()=>{
 const rt=ready({storage:{'eaf.market':'us'}});rt.setInputs({kmShared:1200,evVerbrauch:30,strompreis:.16,verbrauchVerbrenner:26,benzinpreis:3.2});
 const text=rt.run('longtermActive=false;rideshareActive=true;ridesharePersons=3;buildShareTextCompare(_getCompareData())');
 assert.match(text,/\$57\.60/);assert.match(text,/estimated difference \$30\.03 per person/);assert.match(text,/Electric.*lower/i);
});

test('B12: zero-distance comparison hides judgement and positive distance restores it',()=>{
 const rt=ready();rt.element('compareBadge');rt.setInputs({kmShared:0});rt.run('longtermActive=false;calcCompare()');
 assert.equal(rt.elements.get('compareBadge').hidden,true);
 rt.setInputs({kmShared:100});rt.run('calcCompare()');assert.equal(rt.elements.get('compareBadge').hidden,false);
});
for(const [market,threshold] of [['us',1900],['de',3000]])test(`B20 ${market}: live changes and repaint use the same warning threshold`,()=>{
 const rt=distanceRuntime(market);
 for(const value of [threshold-1,threshold,threshold+1]){
  rt.run(`setKmMonat(${value})`);assert.equal(rt.elements.get('ltKmWarn').hidden,value<=threshold);
  rt.run('applyLongterm()');assert.equal(rt.elements.get('ltKmWarn').hidden,value<=threshold);
 }
});
test('B23: empty English range has no unresolved distance token',()=>{
 const rt=ready({storage:{'eaf.market':'us'}});rt.setInputs({evVerbrauch:0});rt.run('updateRangeDisplay()');
 assert.doesNotMatch(rt.elements.get('rangeDisplay').textContent,/\{km\}/);
});

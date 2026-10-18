import test from 'node:test';
import assert from 'node:assert/strict';
import {ready} from './history-runtime.mjs';
const close=(a,e)=>assert.ok(Math.abs(a-e)<1e-10*Math.max(1,Math.abs(e)),`${a} != ${e}`);
const singleCases=[['de','ev',123,16.5,.42,8.5239],['eu','ev',123,16.5,.42,8.5239],['de','vb',333,8.3,1.79,49.47381],['us','ev',120,28,.18,6.048],['us','vb',250,32,3.45,26.953125],['tr','ev',200,17,3.4,115.6],['tr','vb',150,7,63,661.5]];
for(const [market,type,km,consumption,price,expected] of singleCases)test(`Grok reference single ${market} ${type} ${km}`,()=>{
 const rt=ready({storage:{'eaf.market':market}});rt.setInputs(type==='ev'?{kmEv:km,evVerbrauch:consumption,strompreis:price}:{kmVb:km,verbrauchVerbrenner:consumption,benzinpreis:price});rt.run(`singleType='${type}';longtermActive=false`);close(rt.run('_getSingleData().totalCost'),expected);
});
const comparisons=[['de',1000,17,.35,7,1.85,59.5,129.5],['eu',2500,18,.4,6.5,1.75,180,284.375],['us',1000,30,.16,25,3.2,48,128],['us',1200,30,.16,26,3.2,57.6,147.69230769230768],['tr',1000,17,3.4,7,63,578,4410]];
for(const [market,km,ev,ep,vb,vp,ee,ve]of comparisons)test(`Grok reference compare ${market} ${km}`,()=>{
 const rt=ready({storage:{'eaf.market':market}});rt.setInputs({kmShared:km,evVerbrauch:ev,strompreis:ep,verbrauchVerbrenner:vb,benzinpreis:vp});const d=rt.run('longtermActive=false;_getCompareData()');close(d.eAutoTotal,ee);close(d.verbrennerTotal,ve);close(d.diffSig,ve-ee);
 for(const n of [3,4]){const share=rt.run(`rideshareActive=true;ridesharePersons=${n};_getCompareData()`);close(share.eAutoPerPerson,ee/n);close(share.verbrennerPerPerson,ve/n);}
});
const longterms=[
 ['de',1500,8,6000,18,.4,6.5,1.75,10368,16380,12],['de',1500,5,6000,18,.4,6.5,1.75,6480,10237.5,-2242.5],['de',1500,0,6000,18,.4,6.5,1.75,0,0,-6000],['de',1000,10,5000,17,.35,7,1.85,7140,15540,3400],
 ['de',1500,8,6000,25,.79,5,1.6,28440,11520,-22920],['de',99999,8,6000,25,.79,5,1.6,94800,38400,-62400],['us',1000,10,5500,30,.16,26,3.2,5760,14769.23076923077,3509.23076923077],['tr',1000,10,250000,17,3.4,7,63,69360,529200,209840],['tr',1000,5,250000,17,3.4,7,63,34680,264600,-20080],['tr',1000,10,250000,30,9,4,40,324000,192000,-382000]];
for(const [market,km,years,premium,ev,ep,vb,vp,ee,ve,net]of longterms)test(`Grok reference longterm ${market} ${km} ${years} ${ev}`,()=>{
 const rt=ready({storage:{'eaf.market':market}});rt.element('kmMonat');rt.elements.get('kmMonat').min=market==='us'?'50':'100';rt.elements.get('kmMonat').max=market==='us'?'3100':'5000';rt.setInputs({evVerbrauch:ev,strompreis:ep,verbrauchVerbrenner:vb,benzinpreis:vp});rt.run(`setKmMonat(${km});longtermActive=true;longtermYears=${years};longtermPremium=${premium}`);const d=rt.run('_getLongtermSummary(_getCompareData())');close(d.evEnergyCost,ee);close(d.fuelCost,ve);close(d.netDifference,net);
});
for(const market of ['de','eu','us','tr'])for(const language of ['de','en','tr'])test(`physical equivalence ${market}/${language}`,()=>{
 const rt=ready({storage:{'eaf.market':market}});rt.run(`window.EAF_I18N.setLanguage('${language}')`);
 // Same physical journey, same numeric monetary unit; no foreign exchange assumption.
 rt.setInputs(market==='us'?{kmShared:160.9344/1.609344,evVerbrauch:20*1.609344,strompreis:.4,verbrauchVerbrenner:100*3.785411784/(1.609344*8),benzinpreis:1.5*3.785411784}:{kmShared:160.9344,evVerbrauch:20,strompreis:.4,verbrauchVerbrenner:8,benzinpreis:1.5});
 const d=rt.run('longtermActive=false;_getCompareData()');close(d.eAutoTotal,12.874752);close(d.verbrennerTotal,19.312128);assert.equal(rt.run('window.EAF_I18N.getLanguage()'),language);
});

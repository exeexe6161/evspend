import test from 'node:test';
import assert from 'node:assert/strict';
import {ready,historyRuntime,historyKey,entry} from './history-runtime.mjs';
const legalKeys=['calcInfoBlock','calcInfoBlockUs','privacyNotice','footerNote','hintCompareFoot','hintSingleFoot','longtermFootnote','shareImgDisclaimer','shareImgExclusions','shareTextDisclaimer','verlaufPrivacy'];
const textInputs={evVerbrauch:17,strompreis:.37,benzinpreis:1.85,verbrauchVerbrenner:7,kmEv:50,kmVb:50,kmShared:1000,batteryKwh:60,kmMonat:1000,longtermPremium:5000,longtermYears:10,ridesharePersons:1,compareHeroVal:'',compareBadge:'',compareBody:'',compareEmpty:'',singleHeroVal:'',singleCost100:'',singleBody:'',singleEmpty:'',rangeDisplay:'',marketSwitchLabel:'',qSaveBtn:'',saveHint:'',longtermYearsV:''};
for(const market of ['de','eu','us','tr']){
 test(`B05 ${market}: initial and input results are immediate, read-only until edited`,()=>{
  const original=JSON.stringify([entry()]);const rt=ready({inputs:textInputs,storage:{'eaf.market':market,[historyKey]:original}});
  const expected=rt.run('_fmtMoney(Math.abs(_compareDifferenceForDisplay(_getCompareData())))');
  assert.equal(rt.elements.get('compareHeroVal').textContent,expected);
  assert.equal(rt.run("document.body.hasAttribute('data-result-stale')"),false);
  rt.elements.get('strompreis').value=market==='tr'?'4':'.45';rt.elements.get('strompreis').dispatchEvent({type:'input'});
  assert.equal(rt.elements.get('compareHeroVal').textContent,rt.run('_fmtMoney(Math.abs(_compareDifferenceForDisplay(_getCompareData())))'));
  assert.equal(rt.storage.get(historyKey),original);
 });
 for(const language of ['de','en','tr'])test(`B16/B18/B25/B42 ${market}/${language}: qualified share, period label and market terminology`,()=>{
  const rt=ready();rt.run(`window.EAF_I18N.setMarket('${market}');window.EAF_I18N.setLanguage('${language}');rideshareActive=true;ridesharePersons=3;longtermActive=false`);
  const d=rt.run('_getCompareData()');const sentence=rt.run("_resultSentence(_getCompareData(),'compare','share')");
  assert.doesNotMatch(sentence,/\)\s*\(/);assert.ok(sentence.includes('3'));assert.ok(Number.isFinite(d.eAutoTotal));
  assert.match(rt.run("_t('totalSavingsLabel')"),language==='de'?/Ende des Zeitraums/:language==='en'?/end of the period/:/Dönem sonunda/);
  assert.match(rt.run("_t('exampleValuesHint')"),language==='de'?/Beispiele/:language==='en'?/examples/:/örnektir/);
  if(language==='en')assert.equal(rt.run("_t('labelIceConsumption')"),market==='us'?'Fuel economy':'Fuel consumption');
  for(const key of legalKeys)assert.equal(typeof rt.run(`_t('${key}')`),'string');
 });
}
test('B26-B31: Turkish operational copy is consistent and history search retains old aliases',()=>{
 const rt=ready({storage:{'eaf.market':'tr'}});const tr=rt.run('window.EAF_I18N.translations.tr');
 assert.equal(tr.typeVb,'İçten yanmalı araç');assert.equal(tr.entriesHeader,'Kayıtlar');assert.match(tr.breakevenAfter,/başabaş noktası/);assert.match(tr.kmPerYearApprox,/Yılda yaklaşık/);
 assert.match(tr.shareRideshareLine,/Ortak yolculuk/);assert.match(tr.confirmReset,/emin misin/);
 const history=historyRuntime({storage:{'eaf.market':'tr',[historyKey]:JSON.stringify([entry({type:'vb'})])}});
 assert.equal(history.elements.get('histList').children.length,1);
});
test('B37: German document title is localized and follows explicit language changes',()=>{
 const rt=ready();assert.match(rt.run('document.title'),/Strom und Kraftstoffkosten berechnen/);
 rt.run("window.EAF_I18N.setLanguage('en')");assert.match(rt.run('document.title'),/Electric & Fuel Cost Calculator/);
});

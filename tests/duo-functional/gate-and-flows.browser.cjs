// F1 bis F3: Gate Wahrheit, Touch Bedienung und Berechnungen, Daten Paritaet (mit und ohne Duo CSS)
const L=require('./lib.cjs');
const {P,ls,txt,results,setInputs,fp,fpEq,settle}=L;
L.run(async b=>{
// ---------- F1 Gate Wahrheit mit echten Seiten
for(const [prof,w,h,exp] of [['touch',840,611,true],['touch',867,611,true],['touch',951,585,true],['touch',951,669,true],['touch',1024,768,true],['touch',1366,1024,true],['touch',839,611,false],['touch',840,479,false],['touch',874,402,false],['touch',669,867,false],['touch',382,620,false],['touch',820,1180,false],['mouse',951,585,false],['mouse',1280,800,false],['mouse',1920,1080,false],['mouse',840,611,false]]){
  const x=await L.open(b,{w,h,profile:prof});const tc=await L.twoCol(x.p);const mq=await L.mq(x.p);
  P(tc===exp&&mq.gate===exp&&!(await L.hscroll(x.p)),`F1 Gate ${prof} ${w}x${h}: zweispaltig=${exp}`,{twoCol:tc,gate:mq.gate,coarse:mq.coarse});
  await x.ctx.close();}
// ---------- F2 Tap, Einzel E-Auto, Einzel Verbrenner, Vergleich, Regler per Touch, Neuberechnung (951x585 touch, je Sprache)
for(const lang of ['de','en','tr']){
 const x=await L.open(b,{w:951,h:585,lang,profile:'touch'});const p=x.p;
 // Tap auf Einzelmodus
 const rSingle=await L.rect(p,'#modeSingleBtn');
 const before=await p.evaluate(()=>({single:document.getElementById('modeSingleBtn').getAttribute('aria-pressed')||document.getElementById('modeSingleBtn').className,cmpVis:!!document.getElementById('compareResult')&&getComputedStyle(document.getElementById('compareResult')).display!=='none'}));
 await L.tap(x,Math.round(rSingle.l+rSingle.w/2),Math.round(rSingle.t+rSingle.h/2));
 const after=await p.evaluate(()=>({single:document.getElementById('modeSingleBtn').getAttribute('aria-pressed')||document.getElementById('modeSingleBtn').className,sglVis:!!document.getElementById('singleResult')&&getComputedStyle(document.getElementById('singleResult')).display!=='none'}));
 P(JSON.stringify(before.single)!==JSON.stringify(after.single),`F2.${lang}.a echter Touch Tap auf Einzelmodus aendert den UI Zustand`,{before:before.single,after:after.single});
 // Tap Verbrenner/E-Auto Auswahl
 const rVb=await L.rect(p,'#typeVbBtn');const vbBefore=await p.evaluate(()=>document.getElementById('typeVbBtn').className+'|'+document.getElementById('typeVbBtn').getAttribute('aria-pressed'));
 await L.tap(x,Math.round(rVb.l+rVb.w/2),Math.round(rVb.t+rVb.h/2));
 const vbAfter=await p.evaluate(()=>document.getElementById('typeVbBtn').className+'|'+document.getElementById('typeVbBtn').getAttribute('aria-pressed'));
 P(vbBefore!==vbAfter,`F2.${lang}.b Tap auf Verbrenner wechselt die Auswahl`,{vbBefore,vbAfter});
 // Berechnung per Tap
 const rc=await L.rect(p,'#calcBtn');const inView=rc.t>=0&&rc.b<=585;
 await p.evaluate(()=>document.getElementById('calcBtn').scrollIntoView({block:'center'}));const rc2=await L.rect(p,'#calcBtn');
 await L.tap(x,Math.round(rc2.l+rc2.w/2),Math.round(rc2.t+rc2.h/2));await p.waitForTimeout(700);
 const r1=await results(p);P(!!r1[1]&&/\d/.test(r1[1]),`F2.${lang}.c Einzelberechnung Verbrenner per Tap liefert Zahl`,r1[1]);
 // Regler per Touch ziehen (Kilometer des Verbrenners)
 await p.evaluate(()=>document.getElementById('kmVb').scrollIntoView({block:'center'}));const rk=await L.rect(p,'#kmVb');const v0=await p.evaluate(()=>document.getElementById('kmVb').value);
 await L.tap(x,Math.round(rk.l+rk.w*0.8),Math.round(rk.t+rk.h/2));
 const v1=await p.evaluate(()=>document.getElementById('kmVb').value);
 P(Number(v1)>Number(v0),`F2.${lang}.d Kilometerregler per Touch aendert den Wert`,{v0,v1});
 // Neuberechnung nach Eingabeaenderung
 await p.evaluate(()=>document.getElementById('calcBtn').click());await p.waitForTimeout(600);const r2=await results(p);
 P(r2[1]!==r1[1],`F2.${lang}.e Ergebnis aktualisiert sich nach Eingabeaenderung`,{vorher:r1[1],nachher:r2[1]});
 // E-Auto Einzel
 await p.evaluate(()=>document.getElementById('typeEvBtn').click());await p.waitForTimeout(300);await p.evaluate(()=>document.getElementById('calcBtn').click());await p.waitForTimeout(600);
 const r3=await results(p);P(!!r3[1]&&/\d/.test(r3[1])&&r3[1]!==r2[1],`F2.${lang}.f Einzelberechnung E-Auto liefert eigene Zahl`,r3[1]);
 // Vergleich Strom gegen Benzin
 await p.evaluate(()=>document.getElementById('modeCompareBtn').click());await p.waitForTimeout(300);await p.evaluate(()=>document.getElementById('calcBtn').click());await p.waitForTimeout(700);
 const r4=await results(p);P(!!r4[0]&&/\d/.test(r4[0]),`F2.${lang}.g Vergleich Strom gegen Benzin liefert Ergebnis`,r4[0]);
 P(x.log.pageerror.length===0&&x.log.failed.length===0,`F2.${lang}.h keine Seiten oder Netzwerkfehler`,x.log);
 await x.ctx.close();}
// ---------- F3 Rechen und Datenparitaet: mit Duo CSS gleich wie ohne (3 Sprachen, hell/dunkel, 3 Zustaende)
for(const lang of ['de','en','tr'])for(const dark of [false,true])for(const st of ['compare','single-ev','single-vb']){
 const res={};
 for(const duo of [false,true]){
  const x=await L.open(b,{w:951,h:585,lang,dark,profile:'touch',duo,single:st!=='compare',vb:st==='single-vb'});const p=x.p;
  await setInputs(p,{kmShared:2500,kmEv:120,kmVb:120,strompreis:0.31,benzinpreis:1.89,evVerbrauch:19.5,verbrauchVerbrenner:6.4,noteInput:'Dienstfahrt'});
  await p.evaluate(()=>document.getElementById('calcBtn').click());await p.waitForTimeout(700);
  res[duo]={r:await results(p),ls:await ls(p),tc:await L.twoCol(p),theme:await p.evaluate(()=>document.documentElement.getAttribute('data-theme')||'')};
  await x.ctx.close();}
 const same=JSON.stringify(res[true].r)===JSON.stringify(res[false].r)&&JSON.stringify(res[true].ls)===JSON.stringify(res[false].ls);
 P(same&&res[true].tc&&!res[false].tc,`F3 ${lang} ${dark?'dunkel':'hell'} ${st}: Ergebnisse und gespeicherte Werte identisch, Duo nur mit CSS`,{tcDuo:res[true].tc,tcNone:res[false].tc,sample:res[true].r[st==='compare'?0:1]});
}
});

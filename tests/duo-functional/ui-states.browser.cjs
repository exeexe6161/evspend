// G1 bis G7 und G9: Marktmenue, Fokus und Tab, Notiz und Tastatur, Falten Entfalten Drehen, Theme, Langzeit, Druck und kleine Hoehe, breite Tablets
const L=require('./lib.cjs');
const {P,ls,txt,results,setInputs,fp,fpEq,settle}=L;
L.run(async b=>{
// ---------- G1 Marktmenue im Zweispalter
for(const lang of ['de','en','tr']){
 const x=await L.open(b,{w:951,h:585,lang,profile:'touch'});const p=x.p;
 const r0=await L.rect(p,'#marketSwitch');await L.tap(x,Math.round(r0.l+r0.w/2),Math.round(r0.t+r0.h/2));
 const open=await p.evaluate(()=>{const m=document.getElementById('marketMenu');const r=m.getBoundingClientRect();const items=[...m.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect();const t=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);return t===b||b.contains(t)});return {hidden:m.hidden,l:Math.round(r.left),t:Math.round(r.top),r:Math.round(r.right),b:Math.round(r.bottom),vw:innerWidth,vh:innerHeight,itemsReachable:items}});
 P(!open.hidden&&open.r<=open.vw&&open.b<=open.vh&&open.itemsReachable.length===4&&open.itemsReachable.every(Boolean),`G1.${lang}.a Marktmenue oeffnet, liegt im Fenster, alle 4 Eintraege tippbar (nicht von Ergebnisspalte ueberdeckt)`,open);
 await p.keyboard.press('Escape');await p.waitForTimeout(250);let hid=await p.evaluate(()=>document.getElementById('marketMenu').hidden);
 if(!hid){await L.tap(x,40,300);await p.waitForTimeout(250);hid=await p.evaluate(()=>document.getElementById('marketMenu').hidden);}
 P(hid,`G1.${lang}.b Marktmenue schliesst`);
 // Marktwechsel auf US, Zweispalter bleibt, Speicher gesetzt, Reload behaelt Markt
 await L.tap(x,Math.round(r0.l+r0.w/2),Math.round(r0.t+r0.h/2));
 const rUs=await p.evaluate(()=>{const q=document.querySelector('#marketMenu [data-market="us"]').getBoundingClientRect();return {x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2)}});
 await L.tap(x,rUs.x,rUs.y);await p.waitForTimeout(900);
 const st=await ls(p);const lab=await p.evaluate(()=>document.getElementById('marketSwitchLabel').textContent.trim());
 P(st['eaf.market']==='us'&&await L.twoCol(p),`G1.${lang}.c Marktwechsel auf US: Speicher eaf.market=us, Zweispalter bleibt`,{market:st['eaf.market'],label:lab,url:p.url().replace(L.BASE,'')});
 const keep=await p.evaluate(()=>({k:localStorage.getItem('eaf.market')}));
 await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(800);
 const st2=await ls(p);P(st2['eaf.market']==='us'&&await L.twoCol(p),`G1.${lang}.d Marktwahl bleibt nach Neuladen erhalten`,{market:st2['eaf.market']});
 P(x.log.pageerror.length===0,`G1.${lang}.e keine Seitenfehler`,x.log.pageerror);
 await x.ctx.close();}
// ---------- G2 Tastaturfokus: Tab Reihenfolge, Erreichbarkeit, Vergleich mit/ohne Duo CSS
for(const lang of ['de','en','tr']){
 const res={};
 for(const duo of [false,true]){
  const x=await L.open(b,{w:951,h:585,lang,profile:'touch',duo,single:true});const p=x.p;
  await p.evaluate(()=>document.getElementById('calcBtn').click());await p.waitForTimeout(700);await p.evaluate(()=>{window.scrollTo(0,0);document.activeElement&&document.activeElement.blur()});
  const seq=[];
  for(let i=0;i<70;i++){await p.keyboard.press('Tab');await p.waitForTimeout(40);
   const f=await p.evaluate(()=>{const e=document.activeElement;if(!e||e===document.body)return null;const r=e.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;const t=(cx>=0&&cy>=0&&cx<=innerWidth&&cy<=innerHeight)?document.elementFromPoint(cx,cy):null;const rs=document.querySelector('.result-section');const inRs=rs&&rs.contains(e);const rb=rs?rs.getBoundingClientRect():null;return {n:e.tagName.toLowerCase()+(e.id?'#'+e.id:''),vis:r.width>0&&r.height>0&&cx>=0&&cy>=0&&cx<=innerWidth&&cy<=innerHeight,free:!!t&&(t===e||e.contains(t)||t.contains(e)||!!(t.closest&&t.closest('label')&&t.closest('label').contains(e))),inRs,fade:inRs&&rb?(r.bottom>rb.bottom-26):false}});
   if(!f)continue;seq.push(f);if(seq.length>1&&f.n===seq[0].n)break;}
  res[duo]={seq,hidden:seq.filter(s=>!s.vis).map(s=>s.n),covered:seq.filter(s=>s.vis&&!s.free).map(s=>s.n),fade:seq.filter(s=>s.fade).map(s=>s.n),order:seq.map(s=>s.n)};
  await x.ctx.close();}
 const a=res[true],n=res[false];
 P(JSON.stringify(a.order)===JSON.stringify(n.order),`G2.${lang}.a Tab Reihenfolge identisch mit und ohne Duo CSS`,{n:a.order.length});
 P(a.covered.filter(c=>!n.covered.includes(c)).length===0&&a.hidden.filter(c=>!n.hidden.includes(c)).length===0,`G2.${lang}.b keine neu verdeckten oder unsichtbaren Fokusziele`,{coveredDuo:a.covered,coveredNone:n.covered,hiddenDuo:a.hidden,hiddenNone:n.hidden});
 P(a.fade.length===0,`G2.${lang}.c Fokus landet nie in der Ausblendzone der Ergebnisspalte`,a.fade);
}
// ---------- G3 Notizfeld, Tastatur (Layout Verkleinerung), Rueckweg
{const x=await L.open(b,{w:951,h:585,profile:'touch',single:true});const p=x.p;
 await p.evaluate(()=>document.getElementById('noteInput').scrollIntoView({block:'center'}));const rn=await L.rect(p,'#noteInput');
 await L.tap(x,Math.round(rn.l+rn.w/2),Math.round(rn.t+rn.h/2));
 const foc=await p.evaluate(()=>document.activeElement&&document.activeElement.id);
 await p.keyboard.type('Fahrt Test 1');const val=await p.evaluate(()=>document.getElementById('noteInput').value);
 P(foc==='noteInput'&&val==='Fahrt Test 1',`G3.a Tap fokussiert Notizfeld, Eingabe landet im Feld`,{foc,val});
 const fs=await p.evaluate(()=>parseFloat(getComputedStyle(document.getElementById('noteInput')).fontSize));
 P(fs>=16,`G3.b Notizfeld hat mindestens 16px (kein Fokus Zoom)`,fs);
 await p.setViewportSize({width:951,height:320});await p.waitForTimeout(500);
 const tcSmall=await L.twoCol(p);const v2=await p.evaluate(()=>document.getElementById('noteInput').value);const ac=await p.evaluate(()=>document.activeElement&&document.activeElement.id);
 P(!tcSmall&&v2==='Fahrt Test 1'&&ac==='noteInput'&&!(await L.hscroll(p)),`G3.c Tastatur verkleinert Fenster auf 320 Hoehe: sauber einspaltig, Wert und Fokus bleiben`,{tcSmall,v2,ac});
 await p.setViewportSize({width:951,height:585});await p.waitForTimeout(500);
 P(await L.twoCol(p)&&await p.evaluate(()=>document.getElementById('noteInput').value)==='Fahrt Test 1',`G3.d zurueck auf 585: wieder Zweispalter, Wert erhalten`);
 await x.ctx.close();}
// ---------- G4 Zu und Aufklappen, Drehen ohne Neuladen
for(const lang of ['de','en','tr']){
 const x=await L.open(b,{w:382,h:620,lang,profile:'touch'});const p=x.p;
 await p.evaluate(()=>{const s=(i,v)=>{const e=document.getElementById(i);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))};s('kmShared',2500);});
 await p.evaluate(()=>document.getElementById('calcBtn').click());await p.waitForTimeout(700);
 const r0=await p.evaluate(()=>[document.getElementById('compareHeroVal').textContent.trim(),document.getElementById('kmShared').value]);
 const seq=[];
 for(const [w,h] of [[951,585],[382,620],[951,669],[669,867],[951,585]]){await p.setViewportSize({width:w,height:h});await p.waitForTimeout(450);
  seq.push({w,h,tc:await L.twoCol(p),hs:await L.hscroll(p),r:await p.evaluate(()=>[document.getElementById('compareHeroVal').textContent.trim(),document.getElementById('kmShared').value])});}
 P(seq.every(s=>s.tc===(s.w>=840&&s.h>=480)&&!s.hs&&JSON.stringify(s.r)===JSON.stringify(r0)),`G4.${lang} Auf und Zuklappen/Drehen ohne Neuladen: Layout folgt dem Gate, Ergebnis und Regler bleiben, kein Querscroll`,seq.map(s=>`${s.w}x${s.h}:${s.tc?'2sp':'1sp'}`).join(' '));
 P(x.log.pageerror.length===0,`G4.${lang}.b keine Seitenfehler`);
 await x.ctx.close();}
// ---------- G5 Thema umschalten per Tap
{const x=await L.open(b,{w:951,h:585,profile:'touch'});const p=x.p;const t0=await p.evaluate(()=>document.documentElement.getAttribute('data-theme')||'(auto)');
 const rt=await L.rect(p,'#themeBtn');await L.tap(x,Math.round(rt.l+rt.w/2),Math.round(rt.t+rt.h/2));const t1=await p.evaluate(()=>document.documentElement.getAttribute('data-theme')||'(auto)');
 await L.tap(x,Math.round(rt.l+rt.w/2),Math.round(rt.t+rt.h/2));const t2=await p.evaluate(()=>document.documentElement.getAttribute('data-theme')||'(auto)');
 P(t1!==t0&&await L.twoCol(p)&&!(await L.hscroll(p)),`G5 Themawechsel per Tap im Zweispalter`,{t0,t1,t2});await x.ctx.close();}
// ---------- G6 Langzeit bleibt einspaltig
{const x=await L.open(b,{w:951,h:585,profile:'touch'});const p=x.p;await p.click('label.toggle-switch:has(#longtermToggle)').catch(()=>{});await p.waitForTimeout(900);
 const lt=await p.evaluate(()=>document.body.getAttribute('data-longterm'));P(lt==='on'&&!(await L.twoCol(p))&&!(await L.hscroll(p)),`G6 Langzeitanalyse bleibt einspaltig (data-longterm=${lt})`);await x.ctx.close();}
// ---------- G7 Druck, Mindesthoehe, Tablet
{const x=await L.open(b,{w:951,h:585,profile:'touch'});const p=x.p;await p.emulateMedia({media:'print'});await p.waitForTimeout(300);
 const a=await p.evaluate(()=>getComputedStyle(document.querySelector('.app-main')).display);const x2=await L.open(b,{w:951,h:585,profile:'touch',duo:false});await x2.p.emulateMedia({media:'print'});await x2.p.waitForTimeout(300);
 const n=await x2.p.evaluate(()=>getComputedStyle(document.querySelector('.app-main')).display);
 P(a===n&&a!=='grid',`G7.a Druck unveraendert (app-main display mit/ohne Duo CSS: ${a}/${n})`);await x.ctx.close();await x2.ctx.close();}
for(const [w,h] of [[951,480],[840,480],[951,500]]){const x=await L.open(b,{w,h,profile:'touch'});const p=x.p;await p.evaluate(()=>document.getElementById('calcBtn').click());await p.waitForTimeout(600);
 const s=await L.state(p);const rr=await L.rect(p,'.result-section');
 P(await L.twoCol(p)&&!(await L.hscroll(p))&&rr.b<=h+0.5,`G7.b kleine Hoehe ${w}x${h}: Zweispalter, Ergebnisspalte passt ins Fenster, kein Querscroll`,{bottom:Math.round(rr.b),max:s.max});await x.ctx.close();}
// ---------- G9 Breite Touch Tablets
for(const [w,h,exp] of [[1024,768,true],[1180,820,true],[1366,1024,true],[1280,800,true],[768,1024,false],[820,1180,false],[1024,1366,true]]){
 const x=await L.open(b,{w,h,profile:'touch'});await x.p.evaluate(()=>document.getElementById('calcBtn').click());await x.p.waitForTimeout(600);
 const rr=await L.rect(x.p,'.result-section');const tc=await L.twoCol(x.p);
 P(tc===exp&&!(await L.hscroll(x.p)),`G9 Tablet ${w}x${h}: zweispaltig=${exp}`,{tc,resultLeft:Math.round(rr.l),w});await x.ctx.close();}
});

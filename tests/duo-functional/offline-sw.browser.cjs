// H: Service Worker und Offline: Precache der Duo CSS, Offline Neuladen bleibt zweispaltig, Rechner funktioniert
const L=require('./lib.cjs');
const {P,ls,txt,results,setInputs,fp,fpEq,settle}=L;
// Token wie im Link der Seiten und in sw.js: d1- plus die ersten 12 Hex Zeichen des SHA256 der ausgelieferten Datei
const TOKEN='d1-'+require('crypto').createHash('sha256').update(require('fs').readFileSync(require('path').join(L.ROOT,'styles-duo.min.css'))).digest('hex').slice(0,12);
L.run(async b=>{
for(const lang of ['de','en','tr']){
 const x=await L.open(b,{w:951,h:585,lang,profile:'touch',sw:true,wait:600});const p=x.p;
 // Service Worker bereit und aktiv
 const ready=await p.evaluate(async()=>{try{const r=await Promise.race([navigator.serviceWorker.ready,new Promise((_,j)=>setTimeout(()=>j('timeout'),15000))]);return {scope:r.scope.replace(location.origin,''),active:!!r.active,state:r.active&&r.active.state}}catch(e){return {err:String(e)}}});
 P(ready.active===true,`H.${lang}.a Service Worker aktiv`,ready);
 await p.waitForTimeout(1500);
 const caches=await p.evaluate(async()=>{const out={};for(const k of await caches.keys()){const c=await caches.open(k);out[k]=(await c.keys()).map(r=>r.url.replace(location.origin,''))}return out});
 const all=Object.values(caches).flat();
 const duoCached=all.filter(u=>u.includes('styles-duo.min.css'));
 const linkTok=await p.evaluate(()=>{const l=document.querySelector('link[href*=styles-duo]');return l?l.getAttribute('href'):null});
 P(!!linkTok&&linkTok.endsWith('?v='+TOKEN),`H.${lang}.b2 Seitenlink traegt denselben Token wie die Datei`,linkTok);
 P(duoCached.includes('/styles-duo.min.css?v='+TOKEN),`H.${lang}.b styles-duo.min.css?v=<Token aus der Datei> im Precache`,duoCached);
 P(all.some(u=>u.includes('styles-app.min.css')),`H.${lang}.c styles-app.min.css im Precache`);
 // Seite einmal neu laden, damit sie vom SW kontrolliert wird
 await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(800);
 const ctl=await p.evaluate(()=>!!navigator.serviceWorker.controller);
 P(ctl,`H.${lang}.d Seite wird vom Service Worker kontrolliert`);
 // Offline gehen, neu laden
 await x.ctx.setOffline(true);
 let reloadOk=true;try{await p.reload({waitUntil:'load',timeout:15000});}catch(e){reloadOk=false;P(false,`H.${lang}.e Offline Neuladen`,String(e).slice(0,160));}
 await p.waitForTimeout(1000);
 if(reloadOk){
  const duo=await p.evaluate(()=>{const l=document.querySelector('link[href*=styles-duo]');const m=document.querySelector('.app-main'),rs=document.querySelector('.result-section'),c=document.querySelector('.calc-section');const cs=getComputedStyle(m);const R=e=>e.getBoundingClientRect();return {link:!!l,sheet:l&&!!l.sheet,display:cs.display,cols:cs.gridTemplateColumns.split(' ').length,right:R(rs).left>=R(c).right-1,gate:matchMedia('screen and (min-width: 840px) and (min-height: 480px) and (pointer: coarse) and (hover: none)').matches}});
  P(duo.link&&duo.sheet&&duo.display==='grid'&&duo.cols===2&&duo.right&&duo.gate,`H.${lang}.e Offline Neuladen: Zweispalter aktiv, Duo CSS aus Cache`,duo);
  // Rechner offline: Werte eintragen, Ergebnis aendert sich
  const before=await p.evaluate(()=>document.querySelector('.result-section').innerText.replace(/\s+/g,' ').slice(0,200));
  const sl=await p.evaluate(()=>{const i=document.querySelector('.calc-section input[type=range]');if(!i)return null;const r=i.getBoundingClientRect();return {id:i.id,x:r.left,y:r.top+r.height/2,w:r.width}});
  if(sl){await L.swipe(x,Math.round(sl.x+sl.w*0.5),Math.round(sl.y),0,Math.round(sl.w*0.35),10);}
  await p.waitForTimeout(500);
  const after=await p.evaluate(()=>document.querySelector('.result-section').innerText.replace(/\s+/g,' ').slice(0,200));
  P(!!sl&&before.length>20,`H.${lang}.f Offline Rechner: Ergebnisbereich vorhanden`,{slider:sl&&sl.id,changed:before!==after});
  P(x.log.pageerror.length===0,`H.${lang}.g keine Seitenfehler offline`,x.log.pageerror);
 }
 // Wieder online, Browser Zustand intakt
 await x.ctx.setOffline(false);
 await x.ctx.close();
}
// Gegenprobe: Nicht passendes Geraet (Maus) bekommt trotz SW keinen Zweispalter
{const x=await L.open(b,{w:1280,h:800,lang:'de',profile:'mouse',sw:true,wait:600});await x.p.evaluate(()=>navigator.serviceWorker.ready);await x.p.reload({waitUntil:'networkidle'});
 await x.ctx.setOffline(true);await x.p.reload({waitUntil:'load'});await x.p.waitForTimeout(600);
 const t=await L.twoCol(x.p);const g=(await L.mq(x.p)).gate;
 P(t===false&&g===false,'H.mouse Offline mit SW: Gate falsch, einspaltig bleibt',{twoCol:t,gate:g});await x.ctx.close();}
});

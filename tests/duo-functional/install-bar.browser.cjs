// I: Feste Installationsleiste (nur Web): Ergebnisspalte endet darueber, Seitenende frei, ausserhalb des Gates unveraendert (wartet 8 s pro Fall, Leiste erscheint nach 7 s)
const L=require('./lib.cjs');
const {P,ls,txt,results,setInputs,fp,fpEq,settle}=L;
L.run(async b=>{
for(const lang of ['de','en','tr'])for(const [w,h,prof,single] of [[840,611,'touch',true],[951,585,'touch',true],[951,585,'touch',false],[1280,800,'mouse',true],[382,620,'touch',true]]){
 const x=await L.open(b,{w,h,lang,profile:prof,single,vb:single});const p=x.p;
 await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(8000);
 const bar=await p.evaluate(()=>({vis:document.body.getAttribute('data-pwa-bar'),cardTop:Math.round(document.querySelector('.pwa-bar-card').getBoundingClientRect().top),h:Math.round(document.getElementById('pwaBar').getBoundingClientRect().height)}));
 const gate=(await L.mq(p)).gate;
 const res=[];
 for(const f of [0.25,0.5]){await p.evaluate(f=>window.scrollTo(0,Math.round((document.documentElement.scrollHeight-innerHeight)*f)),f);await p.waitForTimeout(200);res.push(await p.evaluate(()=>{const r=document.querySelector('.result-section').getBoundingClientRect();return {top:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10}}));}
 await p.evaluate(()=>window.scrollTo(0,1e5));await p.waitForTimeout(250);
 const pad=await p.evaluate(()=>({pb:getComputedStyle(document.body).paddingBottom,end:Math.round(Math.max(...[...document.querySelectorAll('footer *')].filter(e=>e.children.length===0&&e.getBoundingClientRect().height>0).map(e=>e.getBoundingClientRect().bottom)))}));
 const tag=`I.${lang}.${prof}.${w}x${h}.${single?'Einzel':'Vergleich'}`;
 if(gate){
  P(bar.vis==='visible',tag+'.a Leiste sichtbar',bar);
  P(res.every(r=>r.bottom<=bar.cardTop-8),tag+'.b Ergebnisspalte endet mindestens 8 px ueber der Leiste',{res,cardTop:bar.cardTop});
  P(pad.end<=bar.cardTop,tag+'.c Seitenende (Footer Inhalt) liegt ueber der Leiste',{end:pad.end,cardTop:bar.cardTop,pb:pad.pb});
 }else{
  // ausserhalb des Gates: Web Zusatz wirkt nicht, Seitenabstand wie bisher (ohne Duo CSS identisch)
  const y=await L.open(b,{w,h,lang,profile:prof,single,vb:single,duo:false});await y.p.reload({waitUntil:'networkidle'});await y.p.waitForTimeout(8000);await y.p.evaluate(()=>window.scrollTo(0,1e5));await y.p.waitForTimeout(250);
  const pad0=await y.p.evaluate(()=>getComputedStyle(document.body).paddingBottom);
  P(pad.pb===pad0,tag+'.d ausserhalb des Gates: unterer Seitenabstand wie ohne Duo CSS',{mit:pad.pb,ohne:pad0,bar:bar.vis});await y.ctx.close();
 }
 await x.ctx.close();}
});

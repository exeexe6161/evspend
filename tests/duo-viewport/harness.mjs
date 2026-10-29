// Browser Regression fuer das Web Duo Layout (styles-duo.css; Chromium Layout, kein WebKit, kein echtes Foldable).
// Ablauf: Je Durchgang startet der Harness einen lokalen Server auf 127.0.0.1 (freier Port) mit den Dateien aus DIST, einmal mit leerer und
// einmal mit der Duo CSS, steuert einen Chromium ueber das DevTools Protokoll und misst jede Kombination aus Fenstergroesse, Sprache,
// Farbschema und Zustand mit probe.js. Dabei entsteht in OUT ein Chromium Profilordner chrome-*, der nicht aufgeraeumt wird: OUT daher
// ausserhalb des Repos waehlen.
// Nicht Teil von npm test, weil ein lokaler Chromium noetig ist. Aufruf (Beispiel):
//   CHROME=<chrome-headless-shell> PROFILE=touch OUT=<Ordner ausserhalb des Repos> node tests/duo-viewport/harness.mjs
//   Optional CHROME_ARGS: zusaetzliche Chromium Argumente (zum Beispiel --no-sandbox, wenn der Lauf als root erfolgt).
//   PROFILE: touch (Tablet/Foldable: pointer coarse, hover none), mouse (Maus Desktop: primaer fine/hover, per blink-settings emuliert, weil headless ohne Zeigegeraet none meldet), touchlaptop (Maus plus Touchscreen: primaer fine/hover, any-pointer coarse).
//   DIST (Standard: Repo Wurzel) liefert die Seiten, CSS (Standard: styles-duo.min.css) die zu pruefende Datei. Service Worker wird umgangen.
// Misst jeden Zustand einmal ohne und einmal mit der Duo CSS und schreibt none.json und cand.json. Danach: node tests/duo-viewport/analyze.mjs <Ordner>
// Grenze: Chromium kennt weder Safari/WebKit noch die echte Fenstergeometrie eines Foldables. Das ersetzt keinen Test in Safari auf einem echten Geraet.
import {spawn} from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const DIST=path.resolve(process.env.DIST||'.'), OUT=path.resolve(process.env.OUT||'.');
if(!process.env.CHROME)throw new Error('CHROME fehlt: Pfad zu einem Chromium oder chrome-headless-shell setzen');
const CSS_FILE=process.env.CSS||'styles-duo.min.css';
const PROFILE=process.env.PROFILE||'touch';if(!['touch','mouse','touchlaptop'].includes(PROFILE))throw new Error('PROFILE: touch, mouse oder touchlaptop');
const TOUCH=PROFILE==='touch';
const CHROME=process.env.CHROME;
const CSS={none:'/* none */',cand:fs.readFileSync(CSS_FILE,'utf8')};
const MIME={html:'text/html',css:'text/css',js:'text/javascript',json:'application/json',svg:'image/svg+xml',png:'image/png',webp:'image/webp',woff2:'font/woff2',ico:'image/x-icon'};
function serve(mode){return new Promise(res=>{const s=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);
 if(p==='/styles-duo.min.css'){rs.writeHead(200,{'Content-Type':'text/css'});return rs.end(CSS[mode]);}
 if(p.endsWith('/'))p+='index.html';let f=path.join(DIST,p);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!f.startsWith(DIST)||!fs.existsSync(f)){rs.writeHead(404);return rs.end();}
 rs.writeHead(200,{'Content-Type':(MIME[f.split('.').pop()]||'application/octet-stream')});rs.end(fs.readFileSync(f));}).listen(0,'127.0.0.1',()=>res(s));});}
const prof=fs.mkdtempSync(path.join(OUT,'chrome-'));
const ch=spawn(CHROME,['--remote-debugging-port=0','--user-data-dir='+prof,'--no-first-run','--no-default-browser-check','--disable-extensions',...(process.env.CHROME_ARGS?process.env.CHROME_ARGS.split(' '):[]),...(PROFILE==='touchlaptop'?['--blink-settings=primaryPointerType=4,availablePointerTypes=6,primaryHoverType=2,availableHoverTypes=3']:[]),...(PROFILE==='mouse'?['--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2']:[]),'about:blank'],{stdio:'ignore'});
async function wsUrl(){for(let i=0;i<100;i++){try{const t=fs.readFileSync(path.join(prof,'DevToolsActivePort'),'utf8').split('\n');return `ws://127.0.0.1:${t[0]}${t[1]}`;}catch{await new Promise(r=>setTimeout(r,100));}}throw new Error('no chrome');}
const ws=new WebSocket(await wsUrl());await new Promise(r=>ws.onopen=r);
let id=0;const pend=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const{res,rej}=pend.get(m.id);pend.delete(m.id);m.error?rej(new Error(JSON.stringify(m.error))):res(m.result);}};
const send=(method,params={},sessionId)=>new Promise((res,rej)=>{const i=++id;const to=setTimeout(()=>{pend.delete(i);rej(new Error('timeout '+method))},20000);pend.set(i,{res:v=>{clearTimeout(to);res(v)},rej:v=>{clearTimeout(to);rej(v)}});ws.send(JSON.stringify({id:i,method,params,sessionId}));});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function newPage(){const{targetId}=await send('Target.createTarget',{url:'about:blank'});const{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});return{targetId,sessionId};}
const evalIn=async(sid,expr)=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true},sid);if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||'eval');return r.result.value;};

const PROBE=fs.readFileSync(new URL('./probe.js',import.meta.url),'utf8');
const VIEWPORTS=JSON.parse(process.env.VPS||'[[840,611],[850,611],[867,611],[867,585],[951,585],[669,867],[382,620],[385,571],[874,402],[839,611],[840,479]]');const LANGS=JSON.parse(process.env.LANGS||'["de","en","tr"]');const THEMES=JSON.parse(process.env.THEMES||'["light","dark"]');const MODES=['none','cand'];
const STATES=[['compare','compare',null],['single-ev','single','ev'],['single-vb','single','vb']];
const results=[];
for(const mode of MODES){const srv=await serve(mode);const base=`http://127.0.0.1:${srv.address().port}`;
 for(const [w,h] of VIEWPORTS)for(const lang of LANGS)for(const theme of THEMES){
  const {targetId,sessionId:sid}=await newPage();
  await send('Page.enable',{},sid);await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:TOUCH},sid);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:theme}]},sid);
  if(TOUCH)await send('Emulation.setTouchEmulationEnabled',{enabled:true},sid);
  await send('Network.enable',{},sid);await send('Network.setBypassServiceWorker',{bypass:true},sid);
  const L={de:['de','de','EUR'],en:['eu','en','EUR'],tr:['tr','tr','TRY']}[lang];await send('Page.addScriptToEvaluateOnNewDocument',{source:`try{localStorage.setItem('eaf.market','${L[0]}');localStorage.setItem('eaf.language','${L[1]}');localStorage.setItem('eaf.currency','${L[2]}');}catch(e){}`},sid);
  await send('Page.navigate',{url:base+({de:'/',en:'/en-eu/',tr:'/tr/'})[lang]},sid);await sleep(900);
  const mq=await evalIn(sid,`(()=>{const m=q=>matchMedia(q).matches;return {coarse:m('(pointer:coarse)'),fine:m('(pointer:fine)'),hoverNone:m('(hover:none)'),hover:m('(hover:hover)'),anyCoarse:m('(any-pointer:coarse)'),anyFine:m('(any-pointer:fine)'),gate:m('screen and (min-width: 840px) and (min-height: 480px) and (pointer: coarse) and (hover: none)'),print:m('print')}})()`);
  for(const [name,appMode,type] of STATES){
   await evalIn(sid,`(()=>{const q=s=>document.querySelector(s);q('#mode${appMode==='single'?'Single':'Compare'}Btn').click();${type?`q('#type${type==='ev'?'Ev':'Vb'}Btn').click();`:''}window.scrollTo({top:0,behavior:'instant'});return 1})()`);await sleep(900);
   const before=await evalIn(sid,`(${PROBE})({phase:'initial'})`);
   await evalIn(sid,`document.querySelector('#calcBtn').click()`);await sleep(900);
   await evalIn(sid,`window.scrollTo({top:0,behavior:'instant'})`);await sleep(250);
   const after=await evalIn(sid,`(${PROBE})({phase:'afterCalc',full:true})`);
   // Berechnung mit geaenderten Eingaben
   const calc2=await evalIn(sid,`(()=>{const set=(i,v)=>{const e=document.getElementById(i);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}};set('kmShared',2500);set('kmEv',120);set('kmVb',120);set('strompreis',0.31);set('benzinpreis',1.89);set('evVerbrauch',19.5);set('verbrauchVerbrenner',6.4);document.getElementById('calcBtn').click();
     const t=i=>{const e=document.getElementById(i);return e?e.textContent.trim().replace(/\\s+/g,' '):null};
     const ls={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);ls[k]=localStorage.getItem(k)}return {cmp:t('compareHeroVal'),sgl:t('singleHeroVal'),cmpAll:t('compareResult'),sglAll:t('singleResult'),ls}})()`);
   await sleep(500);
   results.push({mode,profile:PROFILE,mq,w,h,lang,theme,state:name,before,after,calc2});
  }
  await send('Target.closeTarget',{targetId});
 }
 srv.close();
}
for(const m of MODES)fs.writeFileSync(path.join(OUT,(m==='none'?'none':'cand')+'.json'),JSON.stringify(results.filter(r=>r.mode===m)));
ch.kill();ws.close();console.log('done',results.length);

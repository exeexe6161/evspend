// Wertet none.json und cand.json aus tests/duo-viewport/harness.mjs aus. Exit Code 1, sobald eine Pruefung fehlschlaegt.
// Rect und Ueberlappungsvergleiche nutzen nur die beruhigte Phase nach der Berechnung: direkt nach dem Moduswechsel streut die
// Messung auch zwischen zwei Laeufen ohne CSS (Animationen, schwebender Ergebnis Knopf), das ist kein CSS Effekt.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Rechteckvergleich ausserhalb der Duo Media Query, wo die CSS nichts bewirken darf: Chromium rundet verschachtelte Subpixel Positionen
// zwischen zwei Seitenladungen gelegentlich um 0,4 bis 0,5 px unterschiedlich. Erlaubt ist je Koordinate maximal 1 px Differenz. Anzahl und
// Reihenfolge der Elemente muessen exakt gleich sein, jedes Element muss genau vier Zahlen liefern. Gilt nur fuer diesen einen Vergleich.
export const RECT_TOLERANCE_PX=1;
export function rectsEqualWithin(a,b,tol=RECT_TOLERANCE_PX){
 if(a===b)return true;
 const A=String(a).split('|'),B=String(b).split('|');
 if(A.length!==B.length)return false;
 for(let i=0;i<A.length;i++){
  const p=A[i].split(',').map(Number),q=B[i].split(',').map(Number);
  if(p.length!==4||q.length!==4||p.some(Number.isNaN)||q.some(Number.isNaN))return false;
  for(let j=0;j<4;j++)if(Math.abs(p[j]-q[j])>tol+1e-9)return false;
 }
 return true;
}

const key=x=>[x.profile,x.w,x.h,x.lang,x.theme,x.state].join('|');
// Erwartete Eingabe Media Features je Emulationsprofil: prueft, dass die Emulation realistisch ist, bevor etwas anderes gewertet wird.
const PROFILE_MQ={touch:{coarse:true,fine:false,hoverNone:true,hover:false,anyCoarse:true,anyFine:false},mouse:{coarse:false,fine:true,hoverNone:false,hover:true,anyCoarse:false,anyFine:true},touchlaptop:{coarse:false,fine:true,hoverNone:false,hover:true,anyCoarse:true,anyFine:true}};
const only=(a,b)=>a.filter(x=>!b.includes(x));

export function evaluate(noneRows,candRows,minW,minH){
 const N=new Map(noneRows.map(x=>[key(x),x]));
 const stats={},bad=[];
 const check=(name,ok,k,msg='')=>{(stats[name]??={n:0,bad:0}).n++;if(!ok){stats[name].bad++;bad.push(name+' '+k+' '+msg);}};
 for(const c of candRows){
  const k=key(c),n=N.get(k),a=c.after,b=n.after,duo=c.mq.gate===true;
  check('emulated_input_features_match_profile',JSON.stringify(Object.keys(PROFILE_MQ[c.profile]).map(f=>c.mq[f]))===JSON.stringify(Object.values(PROFILE_MQ[c.profile])),k,JSON.stringify(c.mq));
  check('browser_gate_equals_expectation',c.mq.gate===(c.w>=minW&&c.h>=minH&&c.mq.coarse&&c.mq.hoverNone),k,JSON.stringify(c.mq)+' '+c.w+'x'+c.h);
  for(const ph of ['before','after']){const x=c[ph];check('two_columns_exactly_when_guard_matches',x.twoCol===duo,k+' '+ph,'twoCol='+x.twoCol+' erwartet='+duo);check('no_horizontal_scrollbar',!x.hscroll,k+' '+ph,'sw='+x.sw+' cw='+x.cw);check('stylesheet_linked',x.css===true,k+' '+ph);}
  check('no_overlapping_blocks',only(a.blockOverlaps,b.blockOverlaps).length===0,k,JSON.stringify(only(a.blockOverlaps,b.blockOverlaps)));
  check('no_new_overlapping_text_or_controls',only(a.leafOverlaps,b.leafOverlaps).length===0,k,JSON.stringify(only(a.leafOverlaps,b.leafOverlaps).slice(0,3)));
  check('no_new_covered_inputs',only(a.covered,b.covered).length===0,k,JSON.stringify(only(a.covered,b.covered)));
  if(!duo)check('layout_identical_to_no_css_outside_guard',rectsEqualWithin(a.rects,b.rects),k);
  for(const [nm,x,y] of [['results_unchanged_initial',[c.before.cmp,c.before.sgl],[n.before.cmp,n.before.sgl]],['results_unchanged_after_calc',[a.cmp,a.sgl,a.cmpAll,a.sglAll],[b.cmp,b.sgl,b.cmpAll,b.sglAll]],['results_unchanged_changed_inputs',[c.calc2.cmp,c.calc2.sgl,c.calc2.cmpAll,c.calc2.sglAll],[n.calc2.cmp,n.calc2.sgl,n.calc2.cmpAll,n.calc2.sglAll]],['stored_state_unchanged',c.calc2.ls,n.calc2.ls],['language_market_theme_unchanged',[a.lang,a.mkt,a.theme,a.dark],[b.lang,b.mkt,b.theme,b.dark]]])check(nm,JSON.stringify(x)===JSON.stringify(y),k,JSON.stringify([x,y]).slice(0,200));
  if(duo){
   const r=a.res,mid=a.sticky.slice(1,4);
   check('result_column_sticky',r.pos==='sticky'&&/^\d+px$/.test(r.top),k,JSON.stringify(r));
   check('overscroll_behavior_auto',r.ob==='auto',k,r.ob);
   check('scroll_padding_bottom_32px',r.spb==='32px',k,r.spb);
   // Gepinnt: top bleibt gleich. Ausnahme (Sticky Regel): Am Ende des Containers (.app-main) wird die Spalte mit ihm nach oben geschoben, dann faellt ihr Unterrand mit dem Containerrand zusammen.
   // Erwartet wird max(Sticky Abstand, natuerliche Lage): Wurde die Seite erst wenig gescrollt, hat die Spalte ihren Anschlag noch nicht erreicht (natuerliche Lage = Lage bei y=0 minus gescrollte Strecke).
   const first=a.sticky[0];const expTop=s=>Math.max(parseFloat(r.top),first.top-(s.y-first.y));
   check('result_stays_pinned_while_page_scrolls',mid.every(s=>Math.abs(s.top-expTop(s))<=1||(typeof s.mb==='number'&&Math.abs(s.bottom-s.mb)<=1&&s.top<expTop(s))),k,JSON.stringify(mid));
   check('result_fits_viewport',mid.every(s=>s.bottom<=c.h+0.5),k,JSON.stringify(mid));
  }
 }
 return {stats,bad};
}

function main(){
 const dir=path.resolve(process.argv[2]||'.');
 const cssFile=process.env.CSS||'styles-duo.css';
 const m=fs.readFileSync(cssFile,'utf8').match(/@media screen and \(min-width: (\d+)px\) and \(min-height: (\d+)px\) and \(pointer: coarse\) and \(hover: none\)/);
 if(!m)throw new Error('Media Query in '+cssFile+' nicht gefunden');
 const [minW,minH]=[Number(m[1]),Number(m[2])];
 const load=f=>JSON.parse(fs.readFileSync(path.join(dir,f)));
 const C=load('cand.json');
 const {stats,bad}=evaluate(load('none.json'),C,minW,minH);
 console.table(Object.fromEntries(Object.entries(stats).map(([k,v])=>[k,{geprueft:v.n,fehler:v.bad}])));
 console.log('Gate aus CSS: screen, min-width '+minW+'px, min-height '+minH+'px, pointer coarse, hover none');
 if(bad.length){console.log(bad.slice(0,30).join('\n'));process.exit(1);}
 console.log('ALLE PRUEFUNGEN BESTANDEN ('+C.length+' Zustaende)');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();

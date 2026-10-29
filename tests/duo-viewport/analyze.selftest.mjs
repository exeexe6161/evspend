// Selbstpruefung des Analyzers mit synthetischen Messdaten (kein Browser noetig). Aufruf:
//   node --test tests/duo-viewport/analyze.selftest.mjs
// Beweist: Das Gate haengt an Touch Eingabe und Groesse (nicht an der Breite allein); 1 px Rechtecktoleranz gilt nur fuer den Rechteckvergleich ausserhalb der Duo Media Query; alle anderen Pruefungen bleiben streng.
import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,rectsEqualWithin,RECT_TOLERANCE_PX} from './analyze.mjs';

const MIN_W=840,MIN_H=480;
const MQ={touch:{coarse:true,fine:false,hoverNone:true,hover:false,anyCoarse:true,anyFine:false},mouse:{coarse:false,fine:true,hoverNone:false,hover:true,anyCoarse:false,anyFine:true},touchlaptop:{coarse:false,fine:true,hoverNone:false,hover:true,anyCoarse:true,anyFine:true}};
const mqFor=(profile,w,h)=>({...MQ[profile],gate:w>=MIN_W&&h>=MIN_H&&MQ[profile].coarse&&MQ[profile].hoverNone,print:false});
const RECTS='0,0,382,120|10,20,300,40.5|10,70,300,200|0,300,382,10';
const phase=(over={})=>({twoCol:false,hscroll:false,css:true,sw:382,cw:382,blockOverlaps:[],leafOverlaps:[],covered:[],rects:RECTS,
 cmp:'87,60 €',sgl:'—',cmpAll:'a',sglAll:'b',lang:'de',mkt:'DE · €',theme:null,dark:false,
 res:{pos:'static',top:'auto',ob:'auto',spb:'0px'},sticky:[{y:0,top:300,bottom:600}],...over});
const row=(w,h,{before={},after={},calc2={},profile='touch',mq}={})=>({profile,mq:mq||mqFor(profile,w,h),w,h,lang:'de',theme:'light',state:'compare',
 before:phase(before),after:phase(after),calc2:{cmp:'151,28 €',sgl:'—',cmpAll:'c',sglAll:'d',ls:{'eaf.market':'de'},...calc2}});
const duoPhase=(over={})=>phase({twoCol:true,sw:867,cw:867,res:{pos:'sticky',top:'62px',ob:'auto',spb:'32px'},
 sticky:[{y:0,top:199,bottom:736},{y:300,top:62,bottom:599},{y:600,top:62,bottom:599},{y:900,top:62,bottom:599},{y:1200,top:62,bottom:599}],...over});
const duoRow=(o={})=>({profile:'touch',mq:mqFor('touch',867,611),w:867,h:611,lang:'de',theme:'light',state:'compare',before:duoPhase(o.before),after:duoPhase(o.after),
 calc2:{cmp:'151,28 €',sgl:'—',cmpAll:'c',sglAll:'d',ls:{'eaf.market':'de'}}});
const failed=(none,cand)=>evaluate([none],[cand],MIN_W,MIN_H).bad.map(b=>b.split(' ')[0]);

test('rectsEqualWithin: 0,5 px akzeptiert, bis einschliesslich 1 px, darueber abgelehnt',()=>{
 assert.equal(RECT_TOLERANCE_PX,1);
 assert.ok(rectsEqualWithin(RECTS,RECTS));
 assert.ok(rectsEqualWithin(RECTS,'0,0,382,120|10,20.5,300,40.5|10,70,300,200|0,300,382,10'),'0,5 px in top');
 assert.ok(rectsEqualWithin(RECTS,'0,0,382,120|10,20,300.5,40|10,70,300,200|0,300,382,10'),'0,5 px in Breite und Hoehe');
 assert.ok(rectsEqualWithin(RECTS,'0,0,382,120|10,21,300,40.5|10,70,300,200|0,300,382,10'),'genau 1 px');
 assert.ok(!rectsEqualWithin(RECTS,'0,0,382,120|10,21.2,300,40.5|10,70,300,200|0,300,382,10'),'1,2 px');
 assert.ok(!rectsEqualWithin(RECTS,'0,0,382,120|10,20,300,42|10,70,300,200|0,300,382,10'),'1,5 px Hoehe');
});

test('rectsEqualWithin: fehlende, zusaetzliche oder defekte Elemente werden abgelehnt',()=>{
 assert.ok(!rectsEqualWithin(RECTS,'0,0,382,120|10,20,300,40.5|10,70,300,200'),'ein Element fehlt');
 assert.ok(!rectsEqualWithin(RECTS,RECTS+'|0,310,382,5'),'ein Element zusaetzlich');
 assert.ok(!rectsEqualWithin(RECTS,'0,0,382,120|10,20,300,40.5|0,300,382,10|10,70,300,200'),'Reihenfolge vertauscht');
 assert.ok(!rectsEqualWithin(RECTS,'0,0,382,120|10,20,300|10,70,300,200|0,300,382,10'),'nur drei Zahlen');
 assert.ok(!rectsEqualWithin(RECTS,'0,0,382,120|10,x,300,40.5|10,70,300,200|0,300,382,10'),'keine Zahl');
});

test('Analyzer ausserhalb der Duo Grenze: 0,5 px Rechtecke bestehen, mehr als 1 px und fehlende Elemente schlagen fehl',()=>{
 const none=row(382,620);
 assert.deepEqual(failed(none,row(382,620)),[]);
 assert.deepEqual(failed(none,row(382,620,{after:{rects:'0,0,382,120|10,20.5,300,40.5|10,70,300,200|0,300,382,10'}})),[],'0,5 px');
 assert.deepEqual(failed(none,row(382,620,{after:{rects:'0,0,382,120|10,22,300,40.5|10,70,300,200|0,300,382,10'}})),['layout_identical_to_no_css_outside_guard'],'2 px');
 assert.deepEqual(failed(none,row(382,620,{after:{rects:'0,0,382,120|10,20,300,40.5|10,70,300,200'}})),['layout_identical_to_no_css_outside_guard'],'Element fehlt');
});

test('Alle uebrigen Pruefungen bleiben streng (keine Toleranz, keine Ausnahme)',()=>{
 const none=row(382,620);const ov='span"a"~button#x:10x10';
 assert.deepEqual(failed(none,row(382,620,{after:{leafOverlaps:[ov]}})),['no_new_overlapping_text_or_controls'],'neue Ueberlappung Text/Controls');
 assert.deepEqual(failed(none,row(382,620,{after:{blockOverlaps:['.hdr h1~#marketSwitch:20x20']}})),['no_overlapping_blocks'],'neue Blockueberlappung');
 assert.deepEqual(failed(none,row(382,620,{after:{covered:['input#kmShared verdeckt von div.x']}})),['no_new_covered_inputs'],'verdeckte Eingabe');
 assert.deepEqual(failed(none,row(382,620,{after:{hscroll:true}})),['no_horizontal_scrollbar'],'horizontale Scrollleiste');
 assert.deepEqual(failed(none,row(382,620,{after:{cmp:'87,61 €'}})),['results_unchanged_after_calc'],'Ergebnis um 0,01 verschieden');
 assert.deepEqual(failed(none,row(382,620,{calc2:{ls:{'eaf.market':'tr'}}})),['stored_state_unchanged'],'gespeicherter Zustand');
 assert.ok(failed(none,row(382,620,{after:{twoCol:true},before:{twoCol:true}})).includes('two_columns_exactly_when_guard_matches'),'Zweispalter ausserhalb der Grenze');
});

test('Innerhalb der Duo Grenze bleiben Sticky und Scroll Pruefungen streng',()=>{
 const none=row(867,611),ok=duoRow();
 assert.deepEqual(failed(none,ok),[],'gueltiger Duo Zustand');
 assert.deepEqual(failed(none,duoRow({after:{twoCol:false}})),['two_columns_exactly_when_guard_matches'],'Duo ohne zwei Spalten');
 assert.deepEqual(failed(none,duoRow({after:{res:{pos:'static',top:'62px',ob:'auto',spb:'32px'}}})),['result_column_sticky'],'nicht sticky');
 assert.deepEqual(failed(none,duoRow({after:{res:{pos:'sticky',top:'62px',ob:'contain',spb:'32px'}}})),['overscroll_behavior_auto'],'overscroll contain');
 assert.deepEqual(failed(none,duoRow({after:{res:{pos:'sticky',top:'62px',ob:'auto',spb:'20px'}}})),['scroll_padding_bottom_32px'],'scroll padding 20px');
 assert.deepEqual(failed(none,duoRow({after:{sticky:[{y:0,top:199,bottom:736},{y:300,top:70,bottom:607},{y:600,top:70,bottom:607},{y:900,top:70,bottom:607},{y:1200,top:70,bottom:607}]}})),['result_stays_pinned_while_page_scrolls'],'Ergebnis rutscht um 8 px');
 assert.deepEqual(failed(none,duoRow({after:{sticky:[{y:0,top:199,bottom:736},{y:300,top:62,bottom:700},{y:600,top:62,bottom:700},{y:900,top:62,bottom:700},{y:1200,top:62,bottom:700}]}})),['result_fits_viewport'],'Ergebnis ragt aus dem Fenster');
 assert.deepEqual(failed(none,duoRow({after:{sticky:[{y:0,top:199,bottom:736,mb:1296},{y:300,top:62,bottom:599,mb:1061},{y:600,top:62,bottom:599,mb:825},{y:900,top:53.2,bottom:590.2,mb:590.2},{y:1200,top:-181,bottom:355,mb:355}]}})),[],'am Containerende nach oben geschoben ist korrekt');
 assert.deepEqual(failed(none,duoRow({after:{sticky:[{y:0,top:199,bottom:736,mb:1296},{y:300,top:62,bottom:599,mb:1061},{y:600,top:53,bottom:590,mb:1000},{y:900,top:62,bottom:599,mb:825},{y:1200,top:62,bottom:599,mb:700}]}})),['result_stays_pinned_while_page_scrolls'],'Verschiebung ohne Containerende bleibt ein Fehler');
 assert.deepEqual(failed(none,duoRow({after:{sticky:[{y:0,top:199,bottom:736,mb:1296},{y:128,top:71,bottom:608,mb:1168},{y:255,top:62,bottom:599,mb:1041},{y:383,top:62,bottom:599,mb:913},{y:1200,top:62,bottom:599,mb:700}]}})),[],'wenig gescrollt: Spalte hat den Anschlag noch nicht erreicht');
 assert.deepEqual(failed(none,duoRow({after:{sticky:[{y:0,top:199,bottom:736,mb:1296},{y:128,top:90,bottom:599,mb:1168},{y:255,top:62,bottom:599,mb:1041},{y:383,top:62,bottom:599,mb:913},{y:1200,top:62,bottom:599,mb:700}]}})),['result_stays_pinned_while_page_scrolls'],'zu weit unten gegenueber natuerlicher Lage');
});

test('Gate haengt an Touch Eingabe: Maus Desktop und Touch Laptop bleiben bei Duo Groesse einspaltig und unveraendert',()=>{
 for(const profile of ['mouse','touchlaptop']){
  const none=row(951,585,{profile}),ok=row(951,585,{profile});
  assert.deepEqual(failed(none,ok),[],profile+' unveraendert');
  assert.ok(failed(none,row(951,585,{profile,before:{twoCol:true},after:{twoCol:true}})).includes('two_columns_exactly_when_guard_matches'),profile+' Zweispalter waere ein Fehler');
  assert.ok(failed(none,row(951,585,{profile,after:{rects:'0,0,951,120|10,20,300,40.5|10,70,300,200|0,300,951,10'}})).includes('layout_identical_to_no_css_outside_guard'),profile+' Layout muss wie ohne CSS sein');
 }
});

test('Touch Profil unter der Schwelle (Smartphone Querformat, schmal, niedrig) bleibt einspaltig; ab 840 x 480 ist Zweispalter Pflicht',()=>{
 for(const [w,h] of [[839,611],[840,479],[874,402],[382,620],[669,867]])assert.deepEqual(failed(row(w,h),row(w,h)),[],w+'x'+h);
 const none=row(951,585);
 assert.ok(failed(none,row(951,585,{before:{twoCol:false},after:{twoCol:false}})).includes('two_columns_exactly_when_guard_matches'),'Touch 951x585 ohne Zweispalter');
});

test('Unrealistische Emulation wird erkannt: falsche Eingabe Features oder Gate Abweichung schlagen fehl',()=>{
 const none=row(951,585);
 assert.ok(failed(none,row(951,585,{mq:{...mqFor('touch',951,585),coarse:false}})).includes('emulated_input_features_match_profile'),'Touch Profil ohne coarse');
 assert.ok(failed(row(951,585,{profile:'mouse'}),row(951,585,{profile:'mouse',mq:{...mqFor('touch',951,585)}})).includes('emulated_input_features_match_profile'),'Maus Profil mit Touch Features');
 assert.ok(failed(none,row(951,585,{mq:{...mqFor('touch',951,585),gate:false}})).includes('browser_gate_equals_expectation'),'Browser meldet Gate falsch');
});

// G8: Desktop und schmale Touch Geraete sehen mit Duo CSS exakt aus wie ohne (alle Elemente, hell und dunkel, 3 Sprachen)
const L=require('./lib.cjs');
const {P,ls,txt,results,setInputs,fp,fpEq,settle}=L;
L.run(async b=>{
// ---------- G8 Desktop und schmale Touch Geraete: exakt wie ohne Duo CSS (alle Elemente, alle Seiten, hell/dunkel)
for(const [prof,w,h] of [['mouse',1280,800],['mouse',1920,1080],['mouse',1024,768],['mouse',951,585],['mouse',2560,1440],['touch',430,932],['touch',382,620],['touch',390,844],['touch',768,1024],['touch',820,1180],['touch',839,611],['touch',840,479]])for(const lang of ['de','en','tr'])for(const dark of [false,true]){
 const r={};for(const duo of [false,true]){const x=await L.open(b,{w,h,lang,dark,profile:prof,duo});await x.p.evaluate(()=>document.getElementById('calcBtn').click());await x.p.waitForTimeout(500);await settle(x.p);r[duo]=await fp(x.p);await x.ctx.close();}
 const eq=fpEq(r[true],r[false],1);let d;if(!eq){const A=r[true].split('|'),B=r[false].split('|');d={nA:A.length,nB:B.length,diff:[]};for(let i=0;i<Math.min(A.length,B.length)&&d.diff.length<4;i++)if(A[i]!==B[i])d.diff.push([i,A[i],B[i]]);}
 P(eq,`G8 ${prof} ${w}x${h} ${lang} ${dark?'dunkel':'hell'}: Layout aller Elemente wie ohne Duo CSS`,d);}
});

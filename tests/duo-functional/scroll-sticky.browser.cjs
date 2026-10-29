// F4: Scroll, Sticky, Scroll Chaining, Rueckwaertswischen, Hinweis zur Berechnung, Footer
const L=require('./lib.cjs');
const {P,ls,txt,results,setInputs,fp,fpEq,settle}=L;
L.run(async b=>{
// ---------- F4 Scroll, Sticky, Hinweis, Footer (touch 951x585 und 951x669, 3 Sprachen, Vergleich und Einzel)
for(const [w,h] of [[951,585],[951,669]])for(const lang of ['de','en','tr'])for(const single of [false,true]){
 const x=await L.open(b,{w,h,lang,profile:'touch',single});const p=x.p;
 await p.evaluate(()=>document.getElementById('calcBtn').click());await p.waitForTimeout(800);
 await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(250);
 const tag=`F4 ${w}x${h} ${lang} ${single?'Einzel':'Vergleich'}`;
 await p.evaluate(()=>{document.querySelector('.result-section').scrollTop=0});await p.waitForTimeout(200);
 const s0=await L.state(p);const rr=await L.rect(p,'.result-section');const cx=Math.round(rr.l+rr.w/2);
 P(rr.t>=0&&rr.l>=w/2-10,`${tag}: Ergebnis rechts`,{l:Math.round(rr.l),t:Math.round(rr.t)});
 // a) Wischen in der Ergebnisspalte, wenn sie scrollbar ist
 if(s0.max>0){await L.swipe(x,cx,Math.min(560,h-30),-250);const s1=await L.state(p);P(s1.rs>s0.rs,`${tag}.a Touch Wischen scrollt die Ergebnisspalte`,{s0,s1});}
 else P(null,`${tag}.a Ergebnisspalte passt ins Fenster (kein Innenscrollen noetig)`,s0);
 // b) bis ans Ende, danach weiterwischen -> Seite bewegt sich (Chaining)
 for(let i=0;i<10;i++)await L.swipe(x,cx,h-40,-(h-120));
 const s2=await L.state(p);const pageMax=await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
 P(s2.rs>=s2.max-1,`${tag}.b Ende der Ergebnisspalte erreichbar`,s2);
 P(s2.sy>0||pageMax<=1,`${tag}.c Weiterwischen reicht an die Seite weiter (Seite bewegt sich oder passt komplett)`,{sy:s2.sy,pageMax:Math.round(pageMax)});
 // d) Hinweis zur Berechnung voll erreichbar
 const note=await p.evaluate(()=>{const s=document.querySelector('.result-section summary');if(!s)return null;const r=s.getBoundingClientRect();return {t:Math.round(r.top),b:Math.round(r.bottom),vh:innerHeight}});
 P(note&&note.t>=0&&note.b<=h-26,`${tag}.d Hinweis zur Berechnung vollstaendig sichtbar (ausserhalb der Ausblendzone)`,note);
 // e) rueckwaerts: ohne Festhaengen
 for(let i=0;i<12;i++)await L.swipe(x,cx,100,(h-160));
 const s3=await L.state(p);P(s3.sy===0&&s3.rs===0,`${tag}.e Rueckwaerts bis zum Anfang ohne Festhaengen`,s3);
 // f) Sticky beim Scrollen links
 const lr=await L.rect(p,'.calc-section');const top0=(await L.rect(p,'.result-section')).t;
 await L.swipe(x,Math.round(lr.l+60),h-40,-300);const s4=await L.state(p);const top1=(await L.rect(p,'.result-section')).t;
 const pm=await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
 P(pm<=1||(s4.sy>0&&top1<=top0+1&&top1>=61),`${tag}.f Wischen links scrollt Seite, Ergebnis bleibt angeheftet`,{sy:s4.sy,top0:Math.round(top0),top1:Math.round(top1)});
 P(!(await L.hscroll(p)),`${tag}.g kein horizontaler Ueberlauf`);
 // h) Footer erreichbar und nicht ueberdeckt
 await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await p.waitForTimeout(300);
 const foot=await p.evaluate(()=>{const f=[...document.querySelectorAll('footer a, .footer a')].filter(a=>/impress|imprint|k[uü]nye/i.test(a.textContent));if(!f.length)return null;const r=f[0].getBoundingClientRect();const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {t:Math.round(r.top),b:Math.round(r.bottom),vh:innerHeight,ok:top===f[0]||f[0].contains(top)}});
 P(foot&&foot.ok&&foot.b<=h&&foot.t>=0,`${tag}.h Footer Impressum Link erreichbar und nicht ueberdeckt`,foot);
 await x.ctx.close();}
});

(function(opts){
 const q=s=>document.querySelector(s);
 const r1=x=>Math.round(x*10)/10;
 const R=e=>{const r=e.getBoundingClientRect();return [r1(r.left),r1(r.top),r1(r.width),r1(r.height)]};
 const vis=e=>{try{if(!e.checkVisibility({visibilityProperty:true,opacityProperty:true}))return false;}catch(_){}const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
 const name=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'');
 const de=document.documentElement;
 const out={phase:opts.phase,w:innerWidth,h:innerHeight,cw:de.clientWidth,sw:de.scrollWidth,bsw:document.body.scrollWidth,sh:de.scrollHeight,sy:Math.round(scrollY),lang:de.lang,theme:de.getAttribute('data-theme'),dark:matchMedia('(prefers-color-scheme: dark)').matches,css:!!q('link[href*=styles-duo]')};
 out.hscroll=out.sw>out.cw+0.5||out.bsw>out.cw+0.5;
 const main=q('.app-main');const mcs=main?getComputedStyle(main):null;out.display=mcs?mcs.display:null;out.cols=mcs?mcs.gridTemplateColumns:null;
 const rs=q('.result-section');const calcS=q('.calc-section');
 out.twoCol=!!(main&&mcs.display==='grid'&&mcs.gridTemplateColumns.split(' ').length===2&&rs&&calcS&&vis(rs)&&R(rs)[0]>=R(calcS)[0]+R(calcS)[2]-1);
 if(rs){const c=getComputedStyle(rs);out.res={pos:c.position,top:c.top,mh:c.maxHeight,ob:c.overscrollBehaviorY,spb:c.scrollPaddingBottom,ov:c.overflowY,rect:R(rs),st:Math.round(rs.scrollTop),max:rs.scrollHeight-rs.clientHeight,vis:vis(rs)};}
 out.longterm=document.body.getAttribute('data-longterm');
 const t=i=>{const e=document.getElementById(i);return e?e.textContent.trim().replace(/\s+/g,' '):null};
 out.cmp=t('compareHeroVal');out.sgl=t('singleHeroVal');out.cmpAll=t('compareResult');out.sglAll=t('singleResult');out.mkt=t('marketSwitchLabel');
 out.rects=[...document.body.querySelectorAll('*')].map(e=>R(e).join(',')).join('|');
 // Bloecke
 const sels=['#marketSwitch','#themeBtn','.hero-banner','.hdr h1','.hdr p','.trust-list','.disclaimer','.mode-toggle','.type-toggle','.calc-section','.cta-section','.result-section','.sticky-cta-wrapper'];
 const blocks=sels.map(s=>[s,q(s)]).filter(([s,e])=>e&&vis(e));
 const ov=(a,b)=>{const x=Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]),y=Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]);return x>2&&y>2?Math.round(x)+'x'+Math.round(y):null};
 out.blockOverlaps=[];
 for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){const [sa,a]=blocks[i],[sb,b]=blocks[j];if(a.contains(b)||b.contains(a))continue;const o=ov(R(a),R(b));if(o)out.blockOverlaps.push(sa+'~'+sb+':'+o);}
 // Blaetter
 const clipRect=(e,rc)=>{let p=e.parentElement;let r=rc.slice();while(p&&p!==document.body){const cs=getComputedStyle(p);if(cs.overflowX!=='visible'||cs.overflowY!=='visible'){const pr=R(p);const l=Math.max(r[0],pr[0]),tp=Math.max(r[1],pr[1]),rr=Math.min(r[0]+r[2],pr[0]+pr[2]),bb=Math.min(r[1]+r[3],pr[1]+pr[3]);if(rr<=l||bb<=tp)return null;r=[l,tp,rr-l,bb-tp];}p=p.parentElement;}return r;};
 const leaves=[];const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 while(tw.nextNode()){const n=tw.currentNode;if(!n.nodeValue.trim())continue;const p=n.parentElement;if(!p||['SCRIPT','STYLE','NOSCRIPT','OPTION'].includes(p.tagName)||p.closest('.sr-only')||p.closest('#pwaBar,#pwaPopup')||!vis(p))continue;const rg=document.createRange();rg.selectNodeContents(n);const b=rg.getBoundingClientRect();if(b.width<=0||b.height<=0)continue;const c=clipRect(p,[r1(b.left),r1(b.top),r1(b.width),r1(b.height)]);if(c)leaves.push({k:'t',el:p,rect:c,n:name(p)+'"'+n.nodeValue.trim().slice(0,18)+'"'});}
 for(const e of document.querySelectorAll('input,button,select,a[href]')){if(!vis(e)||e.closest('#pwaBar,#pwaPopup'))continue;const c=clipRect(e,R(e));if(c)leaves.push({k:'c',el:e,rect:c,n:name(e)});}
 out.nLeaves=leaves.length;out.leafOverlaps=[];
 for(let i=0;i<leaves.length;i++)for(let j=i+1;j<leaves.length;j++){const a=leaves[i],b=leaves[j];if(a.el===b.el)continue;if(a.k==='c'&&a.el.contains(b.el))continue;if(b.k==='c'&&b.el.contains(a.el))continue;if(a.k==='t'&&b.k==='t'&&(a.el.contains(b.el)||b.el.contains(a.el)))continue;const o=ov(a.rect,b.rect);if(o)out.leafOverlaps.push(a.n+'~'+b.n+':'+o);}
 if(opts.full){
  // Sticky und Scrolling
  const maxY=de.scrollHeight-innerHeight;out.maxY=maxY;out.sticky=[];
  for(const f of [0,0.25,0.5,0.75,1]){window.scrollTo({top:Math.round(maxY*f),behavior:'instant'});if(rs&&vis(rs)){const b=R(rs);out.sticky.push({y:Math.round(scrollY),top:b[1],bottom:r1(b[1]+b[3]),h:b[3],mb:main?r1(main.getBoundingClientRect().bottom):null});}}
  window.scrollTo({top:0,behavior:'instant'});
  // verdeckte Eingaben
  out.covered=[];out.nControls=0;
  for(const e of document.querySelectorAll('.app-main input,.app-main button,.app-main select')){if(!vis(e))continue;out.nControls++;e.scrollIntoView({block:'center',inline:'center',behavior:'instant'});const b=e.getBoundingClientRect();const x=b.left+b.width/2,y=b.top+b.height/2;if(x<0||y<0||x>innerWidth||y>innerHeight){out.covered.push(name(e)+' ausserhalb');continue;}const top=document.elementFromPoint(x,y);if(!top||!(top===e||e.contains(top)||(top.contains(e)&&top.tagName==='LABEL')||(top.closest&&top.closest('label')&&top.closest('label').contains(e))))out.covered.push(name(e)+' verdeckt von '+(top?name(top):'null'));}
  window.scrollTo({top:0,behavior:'instant'});if(rs)rs.scrollTop=0;
 }
 return out;
})

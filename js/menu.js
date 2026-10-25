// Home screen, laid out like a game's title screen: the chalkboard, one match card (mode, names, a pen
// carousel per side, colours, difficulty, view, ▶) and a sheet with the rules, memories and credits.
"use strict";

// A pen drawn on a small canvas, for the pen cards and colour swatches.
function penThumb(cv,d){
  const dpr=Math.min(window.devicePixelRatio||1,2),W=cv.clientWidth||160,H=cv.clientHeight||26;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  const g=cv.getContext('2d'),k=Math.min((W-6)/(d.L*1.08),H/(d.r*PEN_W2D*2*1.5));
  g.setTransform(dpr*k,0,0,dpr*k,dpr*W/2,dpr*H/2);drawPen2D(g,{def:d,x:-.03,z:-.03,a:0});
}
const statRow=(l,v)=>`<div class="stat">${l}<b><i style="width:${Math.round(clamp(v,.08,1)*100)}%"></i></b></div>`;
// One side of the match card: a ◀ pen ▶ carousel with the pen's name, tag and stats, colour dots, and one
// small dot per pen to jump straight to it. Against the computer its side shows the rival and his difficulty (and his pen mid-match).
// PENS is trusted static data, so it may go into innerHTML; player names never do.
const SIDES=[['p1','c1'],['p2','c2']];
// Rebuilding a side replaces its buttons, so give focus back to the one the player just used.
function refocus(sel){const el=$(sel);if(el&&!el.disabled)el.focus({preventScroll:true});}
function buildSide(i){
  const [key,ck]=SIDES[i],n=i+1,show=$('#show'+n),dots=$('#grid'+n),sw=$('#sw'+n);
  const lock=G.matchLive,rivalSide=G.mode==='cpu'&&i===1; // pens are fixed once a match starts
  show.closest('.side').classList.toggle('rival',rivalSide);dots.innerHTML='';sw.innerHTML='';
  if(rivalSide){
    // the computer's pen is picked at random when the match starts (cpuPen); during a match, show it
    const p=lock&&pens[1]?pens[1].def:G.challenge?challengePen():null;
    show.innerHTML=p?`<canvas class="big" aria-hidden="true"></canvas><div class="pn">${p.name}</div><div class="pcol"></div>`
      :`<div class="avatar" aria-hidden="true">🧑‍🎓</div><div class="pn">লড়াইয়ের জন্য তৈরি</div><div class="pcol">নিজের কলম নিয়ে আসবে — দেখা যাক কোনটা!</div>`;
    if(p){penThumb(show.querySelector('canvas'),p);show.querySelector('.pcol').textContent=`${p.colorBn} · ${poss(rival())} কলম`;} // the name may come from a link: text only
    return;
  }
  const d=penDef(G[key],G[ck]),k=PENS.findIndex(b=>b.id===G[key]);
  const pick=(id,sel)=>{if(lock)return;G[key]=id;G[ck]=penDef(id,G[ck]).color;refreshMenu();refocus(sel);};
  const step=s=>pick(PENS[(k+s+PENS.length)%PENS.length].id,`#show${n} .arr[data-s="${s}"]`);
  show.innerHTML=`<div class="carousel"><button class="arr" data-s="-1" aria-label="আগের কলম">‹</button><canvas class="big" aria-hidden="true"></canvas><button class="arr" data-s="1" aria-label="পরের কলম">›</button></div>`+
    `<div class="pinfo" aria-live="polite"><div class="pn">${d.name} <span class="pcol">· ${d.colorBn}</span></div><div class="ptag">${d.tag}</div></div>`+
    `<div class="stats">${statRow('গতি',d.speed/18)}${statRow('ওজন',d.m/2.1)}${statRow('গ্রিপ',(d.grip-.85)/.6)}</div>`;
  const cv=show.querySelector('canvas');penThumb(cv,d);
  show.querySelectorAll('.arr').forEach(b=>{b.disabled=lock;b.onclick=()=>step(+b.dataset.s);});
  // swipe the pen sideways to change it
  let x0=null;
  cv.onpointerdown=e=>{x0=e.clientX;};
  cv.onpointerup=e=>{if(x0===null)return;const dx=e.clientX-x0;x0=null;if(Math.abs(dx)>30)step(dx<0?1:-1);};
  PENS.forEach((b,j)=>{
    const c=document.createElement('button');c.className='pdot';c.setAttribute('aria-pressed',j===k);c.setAttribute('aria-label',b.name);c.title=b.name;c.disabled=lock;
    c.onclick=()=>pick(b.id,`#grid${n} .pdot:nth-child(${j+1})`);dots.appendChild(c);
  });
  d.colors.forEach(([id,bn,hex],j)=>{
    const s=document.createElement('button');s.className='swatch';s.style.background=hex;s.title=bn;
    s.setAttribute('aria-label',`${bn} রং`);s.setAttribute('aria-pressed',d.color===id);s.disabled=lock;
    s.onclick=()=>{G[ck]=id;refreshMenu();refocus(`#sw${n} .swatch:nth-child(${j+1})`);};sw.appendChild(s);
  });
}
// The last setup (mode, difficulty, view, pens, colours) is remembered on this device, so ▶ starts it in one tap.
const SETUP_KEY='kolom-juddho:setup';
function loadSetup(){
  try{
    const s=JSON.parse(localStorage.getItem(SETUP_KEY)||'{}');
    if(['cpu','2p'].includes(s.mode))G.mode=s.mode;
    if(['easy','medium','hard'].includes(s.diff))G.diff=s.diff;
    if(s.view==='2d'||(s.view==='3d'&&has3D))G.view=s.view;
    SIDES.forEach(([k,ck])=>{if(byId(s[k])){G[k]=s[k];G[ck]=penDef(s[k],s[ck]).color;}});
  }catch(e){}
}
function saveSetup(){try{localStorage.setItem(SETUP_KEY,JSON.stringify({mode:G.mode,diff:G.diff,view:G.view,p1:G.p1,p2:G.p2,c1:G.c1,c2:G.c2}));}catch(e){}}
// Brand credits come from PENS, so a new pen gets credited automatically.
function buildCredits(){
  const brands={};PENS.forEach(p=>(brands[p.brand]=brands[p.brand]||[]).push(p.name));
  $('#penCredits').innerHTML=Object.entries(brands).map(([b,n])=>`<li><b>${b}</b>: ${n.join(', ')}</li>`).join('');
}
// Sir's table behind the home screen. The CSS .tableshade dims it.
function drawTableBg(){
  const cv=$('#tablebg'),dpr=Math.min(window.devicePixelRatio||1,1.5),W=innerWidth,H=innerHeight;
  const cw=Math.round(W*dpr),ch=Math.round(H*dpr);if(cv.width===cw&&cv.height===ch)return;
  cv.width=cw;cv.height=ch;
  const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);drawTableTop(g,W,H);
}
// Names, remembered on this device: two players' names, plus the rival's (Rashed by default) for
// matches against the computer. Shown only through textContent, canvas text and the board.
const NAME_KEY='kolom-juddho:names';
const cleanName=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,20);
function loadNames(){
  try{
    const n=JSON.parse(localStorage.getItem(NAME_KEY)||'[]'),p=Array.isArray(n)?n:n.p||[]; // older saves were a plain array
    G.names=[0,1].map(i=>cleanName(p[i]));G.rival=cleanName(n.rival);
  }catch(e){}
}
function saveNames(){try{localStorage.setItem(NAME_KEY,JSON.stringify({p:G.names,rival:G.rival}));}catch(e){}}
// Labels that carry the rival's name or depend on the mode.
function pickLabels(){
  const cpu=G.mode==='cpu',r=rival();
  $('#lab1').textContent='';$('#lab2').textContent=cpu?'CPU':'';
  $('#modeCpu').textContent=`🧑‍🎓 ${poss(r)} সাথে`;
  $('#diffLabel').textContent=G.challenge?`${r} খেলবে এই লেভেলে`:`${r} কতটা পাকা?`;$('#segDiff').setAttribute('aria-label',`${r} কতটা পাকা`);
  $('#challenge').textContent=G.challenge?`${r} তোমাকে চ্যালেঞ্জ পাঠিয়েছে! টিফিন শেষের আগেই জবাব দাও।`:cpu?`${r} তোমাকে চ্যালেঞ্জ করেছে! টিফিন শেষ হওয়ার আগেই জবাব দাও।`:'দুই বন্ধু, এক টেবিল। স্যার আসার আগেই ফয়সালা।';
}
function syncNameInputs(){
  const cpu=G.mode==='cpu',n1=$('#name1'),n2=$('#name2');
  n1.value=G.names[0];n1.placeholder=cpu?'তুমি':'প্লেয়ার ১';n1.setAttribute('aria-label',cpu?'তোমার নাম':'প্লেয়ার ১-এর নাম');
  n2.value=cpu?(G.challenge?G.challenge.from:G.rival):G.names[1];n2.readOnly=!!G.challenge;n2.placeholder=cpu?CPU:'প্লেয়ার ২';n2.setAttribute('aria-label',cpu?'কম্পিউটারের নাম':'প্লেয়ার ২-এর নাম');
}
function wireNames(){
  [0,1].forEach(i=>{
    const inp=$('#name'+(i+1));
    inp.oninput=()=>{const v=cleanName(inp.value);if(i===1&&G.mode==='cpu')G.rival=v;else G.names[i]=v;saveNames();pickLabels();};
    inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();if(i)inp.blur();else $('#name2').focus();}};
  });
}
function syncSeg(id,val){document.querySelectorAll(id+' button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===val));}
function refreshMenu(){
  $('#boardDate').textContent=`তারিখ: ${todayBn()}, ${weekdayBn()}`;
  syncSeg('#segMode',G.mode);syncSeg('#segDiff',level());syncSeg('#segView',G.view);
  const cpu=G.mode==='cpu';
  $('#diffGroup').hidden=!cpu;$('#vs').classList.toggle('twop',!cpu);
  syncNameInputs();pickLabels();buildSide(0);buildSide(1);
  document.querySelectorAll('#segMode button').forEach(b=>b.disabled=G.matchLive);$('#lockNote').hidden=!G.matchLive;
  $('#bResume').hidden=!G.matchLive;
  $('#bStart').textContent=G.matchLive?'▶ নতুন খেলা':G.challenge?'▶ চ্যালেঞ্জ নাও':'▶ খেলা শুরু করো';
  syncChallengeBanner();document.querySelectorAll('#segDiff button').forEach(b=>b.disabled=!!G.challenge);
  saveSetup();
}
// Rules, memories and credits live in one sheet with tabs, opened from the top bar.
let sheetFrom=null;
function openSheet(tab){
  if($('#sheet').hidden)sheetFrom=document.activeElement;
  syncSeg('#segSheet',tab);
  document.querySelectorAll('#segSheet button').forEach(b=>b.setAttribute('aria-selected',b.dataset.v===tab));
  document.querySelectorAll('.sheetbody [data-tab]').forEach(p=>p.hidden=p.dataset.tab!==tab);
  $('#sheet').hidden=false;$('.sheetbody').scrollTop=0;$('#sheet .close').focus();
}
function closeSheet(){$('#sheet').hidden=true;if(sheetFrom)sheetFrom.focus({preventScroll:true});}
function openMenu(){G.prevState=G.state;G.state='menu';G.cpuAnim=null;G.aimVis=null;hideBubble();tutor.hide();$('#menu').hidden=false;refreshMenu();drawTableBg();$('#menu').scrollTop=0;}
function wireMenu(){
  const seg=(id,key,after)=>{$(id).onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;G[key]=b.dataset.v;if(after)after();refreshMenu();};};
  seg('#segMode','mode',()=>{if(G.mode!=='cpu')G.challenge=null;}); // two players can't answer a challengeseg('#segDiff','diff');seg('#segView','view');
  if(!has3D){const b=document.querySelector('#segView [data-v="3d"]');b.disabled=true;b.textContent='🏫 3D চলবে না';b.title='এই ডিভাইসে 3D চালু করা যায়নি';}
  buildCredits();loadSetup();readChallenge();wireNames();
  $('#bDropCh').onclick=dropChallenge;$('#bChallenge').onclick=sendChallenge;
  document.querySelectorAll('.toplinks button').forEach(b=>b.onclick=()=>openSheet(b.dataset.sheet));
  $('#segSheet').onclick=e=>{const b=e.target.closest('button');if(b)openSheet(b.dataset.v);};
  document.querySelectorAll('#sheet [data-close]').forEach(b=>b.onclick=closeSheet);
  $('#sheet').onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();closeSheet();}};
  $('#bEndMatch').onclick=()=>{G.matchLive=false;G.prevState='menu';refreshMenu();};
  $('#bShare').onclick=shareFacebook;
  $('#bSave').onclick=()=>{saveShot();shareNote('ছবিটা ডাউনলোড হয়েছে।');};
  $('#bStart').onclick=()=>{ensureAudio();$('#menu').hidden=true;setupMatch();};
  $('#bResume').onclick=()=>{
    $('#menu').hidden=true;setView(G.view);
    if(G.matchLive){if(G.prevState==='moving'||G.prevState==='roundover')G.state=G.prevState;else startTurn();}
  };
  $('#bRematch').onclick=()=>{$('#endScreen').hidden=true;setupMatch();};
  $('#bChange').onclick=()=>{$('#endScreen').hidden=true;openMenu();};
  $('#bMenu').onclick=openMenu;
  $('#bSuper').onclick=toggleSuper;
  $('#bView').onclick=()=>setView(G.view==='3d'?'2d':'3d');
  $('#bCam').onclick=resetCam;
  $('#bMute').onclick=()=>{muted=!muted;$('#bMute').textContent=muted?'🔇':'🔊';};
}

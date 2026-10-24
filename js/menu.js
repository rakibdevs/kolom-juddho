// Home screen: mode, view, pen and colour pickers.
"use strict";

// A pen drawn on a small canvas, for the pen cards and colour swatches.
function penThumb(cv,d){
  const dpr=Math.min(window.devicePixelRatio||1,2),W=cv.clientWidth||160,H=cv.clientHeight||26;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  const g=cv.getContext('2d'),k=Math.min((W-6)/(d.L*1.08),H/(d.r*2.3*2*1.5));
  g.setTransform(dpr*k,0,0,dpr*k,dpr*W/2,dpr*H/2);drawPen2D(g,{def:d,x:-.03,z:-.03,a:0});
}
const statRow=(l,v)=>`<div class="stat">${l}<b><i style="width:${Math.round(clamp(v,.08,1)*100)}%"></i></b></div>`;
// key is 'p1' or 'p2'; the matching colour lives in 'c1' or 'c2'.
function buildGrid(el,key){
  const ck='c'+key[1];el.innerHTML='';
  PENS.forEach(b=>{
    const d=penDef(b.id,G[ck]),btn=document.createElement('button');btn.className='pencard';btn.setAttribute('aria-pressed',G[key]===d.id);
    btn.innerHTML=`<span class="chk">✓ বাছাই</span><canvas class="art" aria-hidden="true"></canvas><div class="pn">${d.name}</div><div class="pbn">${d.bn}</div><div class="ptag">${d.tag}</div>`+statRow('গতি',d.speed/18)+statRow('ওজন',d.m/2.1)+statRow('গ্রিপ',(d.grip-.85)/.6);
    btn.onclick=()=>{G[key]=d.id;G[ck]=penDef(d.id,G[ck]).color;refreshMenu();};
    el.appendChild(btn);penThumb(btn.querySelector('canvas'),d);
  });
  const sw=el.nextElementSibling,cur=penDef(G[key],G[ck]);sw.innerHTML='<span class="swl">রং:</span>';
  cur.colors.forEach(([id,bn,hex])=>{
    const s=document.createElement('button');s.className='swatch';s.setAttribute('aria-pressed',cur.color===id);s.title=bn;
    s.innerHTML=`<i style="background:${hex}"></i>${bn}`;s.onclick=()=>{G[ck]=id;refreshMenu();};sw.appendChild(s);
  });
}
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
function syncSeg(id,val){document.querySelectorAll(id+' button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===val));}
function refreshMenu(){
  $('#boardDate').textContent=`তারিখ: ${todayBn()}, ${weekdayBn()}`;
  syncSeg('#segMode',G.mode);syncSeg('#segDiff',G.diff);syncSeg('#segView',G.view);
  const cpu=G.mode==='cpu';
  $('#diffGroup').hidden=!cpu;
  $('#numView').textContent=cpu?'৩':'২';$('#numPen').textContent=cpu?'৪':'৩';
  $('#challenge').textContent=cpu?`${CPU} তোমাকে চ্যালেঞ্জ করেছে! টিফিন শেষ হওয়ার আগেই জবাব দাও।`:'দুই বন্ধু, এক টেবিল। স্যার আসার আগেই ফয়সালা।';
  $('#lab1').textContent=cpu?'তোমার কলম':'প্লেয়ার ১-এর কলম';
  $('#lab2').textContent=cpu?`${CPU}ের কলম`:'প্লেয়ার ২-এর কলম';
  buildGrid($('#grid1'),'p1');buildGrid($('#grid2'),'p2');
  $('#bResume').hidden=!G.matchLive;
  $('#bStart').textContent=G.matchLive?'নতুন খেলা শুরু করো':'খেলা শুরু করো';
}
function openMenu(){G.prevState=G.state;G.state='menu';G.cpuAnim=null;G.aimVis=null;$('#menu').hidden=false;refreshMenu();drawTableBg();$('#menu').scrollTop=0;}
function wireMenu(){
  const seg=(id,key,after)=>{$(id).onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;G[key]=b.dataset.v;if(after)after();refreshMenu();};};
  seg('#segMode','mode');seg('#segDiff','diff');seg('#segView','view');
  if(!has3D){const b=document.querySelector('#segView [data-v="3d"]');b.disabled=true;$('#d3').textContent='এই ডিভাইসে 3D চালু করা যায়নি';}
  buildCredits();
  $('#bShare').onclick=shareResult;
  $('#bStart').onclick=()=>{ensureAudio();$('#menu').hidden=true;setupMatch();};
  $('#bResume').onclick=()=>{
    $('#menu').hidden=true;setView(G.view);
    if(G.matchLive){if(G.prevState==='moving'||G.prevState==='roundover')G.state=G.prevState;else startTurn();}
  };
  $('#bRematch').onclick=()=>{$('#endScreen').hidden=true;setupMatch();};
  $('#bChange').onclick=()=>{$('#endScreen').hidden=true;openMenu();};
  $('#bMenu').onclick=openMenu;
  $('#bView').onclick=()=>setView(G.view==='3d'?'2d':'3d');
  $('#bCam').onclick=()=>Object.assign(cam,CAM0);
  $('#bMute').onclick=()=>{muted=!muted;$('#bMute').textContent=muted?'🔇':'🔊';};
}

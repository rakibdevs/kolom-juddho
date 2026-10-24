// Turn and round state machine, HUD and toasts.
"use strict";

/* ================= flow ================= */
const isCPU=i=>G.mode==='cpu'&&i===1;
function who(i){return G.mode==='cpu'?(i===0?'তুমি':`${CPU} (CPU)`):(i===0?'প্লেয়ার ১':'প্লেয়ার ২');}
function setView(v){
  if(v==='3d'&&!has3D)v='2d';
  G.view=v;$('#c').style.display=v==='3d'?'block':'none';c2.style.display=v==='2d'?'block':'none';
  $('#bView').textContent=v==='3d'?'2D':'3D';$('#bCam').hidden=v!=='3d';
  if(arrow){arrow.visible=false;pullLine.visible=false;}
}
function setupMatch(){
  if(has3D){meshes.forEach(m=>scene.remove(m.outer));rings.forEach(r=>scene.remove(r));}
  pens=[newPen(penDef(G.p1,G.c1)),newPen(penDef(G.p2,G.c2))];
  if(has3D){meshes=pens.map(p=>makePenMesh(p.def));rings=[makeRing(0x3f6bff),makeRing(0xff4d43)];rings.forEach((r,i)=>r.scale.setScalar(pens[i].L*.62));}
  G.score=[0,0];G.starter=0;G.matchLive=true;
  $('#hud').hidden=false;$('#hint').hidden=false;$('#tools').hidden=false;
  setView(G.view);newRound();
}
function newRound(){
  const z0=(Math.random()-.5)*1.6;
  pens.forEach((p,i)=>{
    Object.assign(p,{x:i?3.2:-3.2,z:z0+(Math.random()-.5)*1.2,a:Math.PI/2+(Math.random()-.5)*.5,vx:0,vz:0,w:0,out:false,falling:null});
    if(meshes[i])meshes[i].inner.rotation.set(0,0,0);
  });
  G.turn=G.starter;startTurn();
}
function startTurn(){
  G.restT=0;G.aimVis=null;updateHUD();
  if(isCPU(G.turn)){
    G.state='cpu';setHint(`${CPU} ভাবছে কোথায় মারবে…`);
    setTimeout(()=>{
      if(G.state!=='cpu')return;
      const plan=planShot(1),p=pens[1];
      G.cpuAnim={plan,t0:performance.now(),cx:p.x+Math.cos(p.a)*plan.s,cz:p.z+Math.sin(p.a)*plan.s};
    },380);
  } else {
    G.state='aim';
    setHint(G.mode==='cpu'?'তোমার কলমে চেপে ধরে পেছনে টানো, তারপর ছেড়ে দাও':`${who(G.turn)}: নিজের কলম চেপে পেছনে টেনে ছাড়ো`);
  }
}
function doShot(i,s,dx,dz,power){
  ensureAudio();applyShot(pens[i],s,dx,dz,power);
  G.state='moving';G.restT=0;acc=0;G.aimVis=null;
  snap(.55+power*.35,2600,.05,1500);setHint('ঠাস!');
}
function startFall(i){
  const p=pens[i],ox=Math.abs(p.x)>HX?Math.sign(p.x):0,oz=Math.abs(p.z)>HZ?Math.sign(p.z):0;
  p.falling={y:TOP+p.r,vy:0,vx:p.vx+ox*1.5,vz:p.vz+oz*1.5,roll:(Math.random()-.5)*18,tiltV:(Math.random()<.5?-1:1)*(3+Math.random()*3),done:false};
}
function endTurn(){
  const sh=G.turn,ot=1-sh;let w=-1,sub='';
  if(pens[sh].out){w=ot;sub=pens[ot].out?'দুটোই পড়েছে, কিন্তু যে মেরেছে সে হারে':'নিজের কলমই পড়ে গেল!';}
  else if(pens[ot].out){w=sh;sub='ঠাস করে টেবিল থেকে ফেলে দিয়েছে!';}
  if(w<0){G.turn=ot;startTurn();return;}
  G.score[w]++;G.state='roundover';updateHUD();
  const done=G.score[w]>=TARGET;
  toast(`${who(w)} রাউন্ড জিতেছে`,sub);setHint(done?'':'পরের রাউন্ড আসছে…');
  setTimeout(()=>{if(G.state!=='roundover')return;if(done)matchOver(w);else{G.starter=1-w;newRound();}},2100);
}
function matchOver(w){
  G.state='matchover';G.matchLive=false;G.aimVis=null;G.cpuAnim=null;
  const cpuWon=G.mode==='cpu'&&w===1;
  $('#endTitle').textContent=cpuWon?`${CPU} জিতে গেল!`:(G.mode==='cpu'?'তুমি চ্যাম্পিয়ন!':`${who(w)} চ্যাম্পিয়ন!`);
  $('#endScore').textContent=`স্কোর ${toBn(G.score[0])} – ${toBn(G.score[1])}`;
  $('#endText').textContent=cpuWon?`${CPU} হাসছে। আবার চেষ্টা করো — কলমের মাথার দিকে মারলে ঘুরে গিয়ে বেশি জোরে লাগে।`:'এই যে, স্যার আসছেন! কলম পকেটে ঢোকাও।';
  prepareShare($('#endTitle').textContent,$('#endScore').textContent);
  $('#endScreen').hidden=false;
}

/* ================= HUD ================= */
function updateHUD(){
  [0,1].forEach(i=>{
    const c=$('#card'+i);c.querySelector('.who').textContent=who(i);c.querySelector('.pen').textContent=pens[i].def.name;
    c.querySelector('.dots').innerHTML=Array.from({length:TARGET},(_,k)=>`<i class="${k<G.score[i]?'on':''}"></i>`).join('');
    c.classList.toggle('active',G.turn===i);
  });
  const t=G.turn,label=G.mode==='cpu'?(t===0?'তোমার পালা':`${CPU}ের পালা`):`${who(t)}-এর পালা`;
  $('#turn').innerHTML=`<span class="sw" style="background:var(--p${t+1})"></span>${label}`;
}
function setHint(s){const h=$('#hint');h.textContent=s;h.style.visibility=s?'visible':'hidden';}
let toastT=0;
function toast(a,b){const t=$('#toast');t.querySelector('.big').textContent=a;t.querySelector('.small').textContent=b||'';t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1800);}

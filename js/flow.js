// Turn and round state machine, HUD and toasts.
"use strict";

/* ================= flow ================= */
const isCPU=i=>G.mode==='cpu'&&i===1;
// Names typed on the home screen are used; empty ones fall back to তুমি / রাশেদ or প্লেয়ার ১ / ২.
function who(i){return G.mode==='cpu'?(i===0?(G.names[0]||'তুমি'):`${rival()} (CPU)`):(G.names[i]||(i===0?'প্লেয়ার ১':'প্লেয়ার ২'));}
function setView(v){
  if(v==='3d'&&(!has3D||G.glLost))v='2d';
  G.view=v;$('#c').style.display=v==='3d'?'block':'none';c2.style.display=v==='2d'?'block':'none';
  $('#bView').textContent=v==='3d'?'2D':'3D';$('#bCam').hidden=v!=='3d';
  if(arrow){arrow.visible=false;pullLine.visible=false;}
}
// Puts these two pen definitions on the table, replacing (and freeing) the previous meshes.
function placePens(defs){
  if(has3D){
    meshes.forEach(m=>{scene.remove(m.outer);m.outer.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.material.map)o.material.map.dispose();o.material.dispose();}});});
    rings.forEach(r=>scene.remove(r));
  }
  pens=defs.map(newPen);
  if(has3D){meshes=pens.map(p=>makePenMesh(p.def));rings=[makeRing(0x3f6bff),makeRing(0xff4d43)];rings.forEach((r,i)=>r.scale.setScalar(pens[i].L*.62));}
}
// Against the computer the player's chosen pen meets a random pen, picked once per match and never the
// player's exact pen and colour. Pens can't change during a match (the home screen locks the pickers).
function cpuPen(){
  if(G.challenge)return challengePen();
  const b=PENS[Math.floor(Math.random()*PENS.length)],cs=b.colors.filter(c=>!(b.id===G.p1&&c[0]===G.c1));
  return penDef(b.id,cs[Math.floor(Math.random()*cs.length)][0]);
}
function setupMatch(){
  refreshBoard();
  placePens([penDef(G.p1,G.c1),G.mode==='cpu'?cpuPen():penDef(G.p2,G.c2)]);
  G.score=[0,0];G.starter=0;G.matchLive=true;G.armed=-1;G.supers=[0,0];G.superGot=[false,false];
  $('#hud').hidden=false;$('#hint').hidden=false;$('#tools').hidden=false;
  resetCam();setView(G.view);newRound();
  if(G.mode==='cpu')setTimeout(()=>toast(`${rival()} আনল ${pens[1].def.name}`,`${pens[1].def.colorBn} রঙের`),350);
  bell(false);setTimeout(()=>say('start'),2300);
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
  G.restT=0;G.aimVis=null;G.turnNo++;updateHUD();
  if(isCPU(G.turn)){
    G.state='cpu';setHint(`${rival()} ভাবছে কোথায় মারবে…`);if(Math.random()<.4)say('turn');
    setTimeout(()=>{
      if(G.state!=='cpu')return;
      const plan=planShot(1),p=pens[1];
      G.cpuAnim={plan,t0:performance.now(),cx:p.x+Math.cos(p.a)*plan.s,cz:p.z+Math.sin(p.a)*plan.s};
    },380);
  } else {
    G.state='aim';setHint(aimHint());tutor.show();
  }
  updateSuper();
}
const aimHint=()=>G.armed===G.turn?'⚡ সুপার টোকা চালু — এবারের টোকা অনেক জোরে যাবে':G.mode==='cpu'?'তোমার কলমে চেপে ধরে পেছনে টানো, তারপর ছেড়ে দাও':`${who(G.turn)}: নিজের কলম চেপে পেছনে টেনে ছাড়ো`;
// The ⚡ button shows on a human player's aiming turn; tapping it arms (or disarms) their next flick.
function updateSuper(){
  const b=$('#bSuper'),t=G.turn,n=G.supers[t],show=G.matchLive&&G.state==='aim'&&!isCPU(t);
  b.hidden=!show;if(!show)return;
  b.disabled=n<=0;b.setAttribute('aria-pressed',G.armed===t);b.classList.toggle('p2',t===1);
  b.querySelector('b').textContent=toBn(n);b.title=n>0?`সুপার টোকা: আর ${toBn(n)} বার`:G.superGot[t]?'সুপার টোকা শেষ':'একটা রাউন্ড জিতলে সুপার টোকা পাবে';
}
function toggleSuper(){
  const t=G.turn;if(G.state!=='aim'||isCPU(t)||G.supers[t]<=0)return;
  G.armed=G.armed===t?-1:t;setHint(aimHint());updateSuper();
}
function doShot(i,s,dx,dz,power){
  const sup=G.armed===i&&G.supers[i]>0; // only the armed human player's flick is boosted
  if(sup){
    const p=pens[i];G.supers[i]--;G.armed=-1;
    p.boost={m:p.m,I:p.I,g:p.grip,keep:SUPER.keep,grip:SUPER.grip,hit:false};p.m*=SUPER.mass;p.I*=SUPER.mass;power*=SUPER.speed;
  }
  ensureAudio();applyShot(pens[i],s,dx,dz,power);buzz(12);
  if(!isCPU(i))tutor.done();
  G.state='moving';G.restT=0;acc=0;G.aimVis=null;
  snap(.55+power*.35,2600,.05,1500);
  if(sup){snap(.9,1600,.14,700);toast('⚡ সুপার টোকা!','');say('super');}
  setHint(sup?'⚡ ঠাস!':'ঠাস!');updateHUD();updateSuper();
}
function startFall(i){
  const p=pens[i],ox=Math.abs(p.x)>HX?Math.sign(p.x):0,oz=Math.abs(p.z)>HZ?Math.sign(p.z):0;
  p.falling={y:TOP+p.r,vy:0,vx:p.vx+ox*1.5,vz:p.vz+oz*1.5,roll:(Math.random()-.5)*18,tiltV:(Math.random()<.5?-1:1)*(3+Math.random()*3),done:false};
}
function endTurn(){
  pens.forEach(clearBoost);
  const sh=G.turn,ot=1-sh;let w=-1,sub='';
  if(pens[sh].out){w=ot;sub=pens[ot].out?'দুটোই পড়েছে, কিন্তু যে মেরেছে সে হারে':'নিজের কলমই পড়ে গেল!';}
  else if(pens[ot].out){w=sh;sub='ঠাস করে টেবিল থেকে ফেলে দিয়েছে!';}
  if(w<0){
    const p=pens[ot],edge=Math.min(HX-Math.abs(p.x),HZ-Math.abs(p.z)); // the other pen stopped right at the edge
    if(edge<.45)say(isCPU(sh)?'close':'saved');
    G.turn=ot;startTurn();return;
  }
  if(G.mode==='cpu')say(w===1?(sh===1?'knock':'oops'):(sh===1?'self':'lost'));
  G.score[w]++;G.state='roundover';updateHUD();
  const done=G.score[w]>=TARGET,earn=!done&&!isCPU(w)&&!G.superGot[w]; // the first round won earns ⚡
  if(earn){G.superGot[w]=true;G.supers[w]=SUPER_USES;updateHUD();}
  toast(`${who(w)} রাউন্ড জিতেছে`,sub);setHint(done?'':'পরের রাউন্ড আসছে…');
  setTimeout(()=>{
    if(G.state!=='roundover')return;
    if(done)matchOver(w);
    else{G.starter=1-w;newRound();if(earn)toast('⚡ সুপার টোকা পেয়েছ!',`${who(w)} · এই ম্যাচে একবার, যখন খুশি`);}
  },2100);
}
function matchOver(w){
  G.state='matchover';G.matchLive=false;G.aimVis=null;G.cpuAnim=null;hideBubble();
  bell(true);
  const cpuWon=G.mode==='cpu'&&w===1,ch=G.challenge;
  $('#endTitle').textContent=ch?(cpuWon?`${poss(rival())} চ্যালেঞ্জ টিকে গেল!`:'চ্যালেঞ্জ জিতেছ!'):cpuWon?`${rival()} জিতে গেল!`:`${who(w)} চ্যাম্পিয়ন!`;
  $('#endScore').textContent=`স্কোর ${toBn(G.score[0])} – ${toBn(G.score[1])}`;
  $('#endText').textContent=ch?(cpuWon?`${rival()} এবার জিতে গেল। আবার চেষ্টা করো, নয়তো পাল্টা চ্যালেঞ্জ পাঠাও।`:`${rival()}কে হারিয়ে দিয়েছ! এবার পাল্টা চ্যালেঞ্জ পাঠাও।`)
    :cpuWon?`${rival()} হাসছে। আবার চেষ্টা করো — কলমের মাথার দিকে মারলে ঘুরে গিয়ে বেশি জোরে লাগে।`:'এই যে, স্যার আসছেন! কলম পকেটে ঢোকাও।';
  const cb=$('#bChallenge');cb.hidden=G.mode!=='cpu';cb.querySelector('span').textContent=ch?'পাল্টা চ্যালেঞ্জ পাঠাও':'বন্ধুকে চ্যালেঞ্জ পাঠাও';
  prepareShare(w);
  $('#endScreen').hidden=false;
}

/* ================= HUD ================= */
function updateHUD(){
  [0,1].forEach(i=>{
    const c=$('#card'+i);c.querySelector('.who').textContent=who(i);c.querySelector('.pen').textContent=pens[i].def.name;
    c.querySelector('.dots').innerHTML=Array.from({length:TARGET},(_,k)=>`<i class="${k<G.score[i]?'on':''}"></i>`).join('')+(isCPU(i)?'':`<span class="spc" title="সুপার টোকা বাকি">⚡${toBn(G.supers[i])}</span>`);
    c.classList.toggle('active',G.turn===i);
  });
  const t=G.turn,label=G.mode==='cpu'?(t===0?'তোমার পালা':`${poss(rival())} পালা`):`${poss(who(t))} পালা`;
  const tn=$('#turn');tn.innerHTML=`<span class="sw" style="background:var(--p${t+1})"></span>`;tn.append(label); // names are player input: text only
}
function setHint(s){const h=$('#hint');h.textContent=s;h.style.visibility=s?'visible':'hidden';}
// The computer's speech bubble beside its score card; text only (the lines are static, the name is not used).
let bubbleT=0;
function say(ev){
  if(G.mode!=='cpu'||!ev||!G.matchLive||G.saidAt===G.turnNo)return;
  const ls=LINES[ev];if(!ls)return;
  G.saidAt=G.turnNo;const b=$('#bubble');b.textContent=ls[Math.floor(Math.random()*ls.length)];
  b.hidden=false;b.classList.remove('show');void b.offsetWidth;b.classList.add('show');
  clearTimeout(bubbleT);bubbleT=setTimeout(hideBubble,2800);
}
function hideBubble(){clearTimeout(bubbleT);const b=$('#bubble');b.classList.remove('show');b.hidden=true;}
let toastT=0;
function toast(a,b){const t=$('#toast');t.querySelector('.big').textContent=a;t.querySelector('.small').textContent=b||'';t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1800);}

// Online play with a friend. One player opens a room and sends its link (?room=CODE.name); the friend opens it,
// picks a pen and joins. The Worker's Room (worker/src/index.js) only relays messages between the two games,
// so both run the same match and keep it the same like this:
// - the player whose turn it is sends the flick ({t:'shot'}), and both screens play it;
// - when the pens stop, the shooter sends where they ended and which fell ({t:'rest'}); the other screen takes
//   that, so tiny floating-point differences between browsers never decide a round;
// - each round's table comes from a seed shared at the start (G.rngState), so both lay out the same pens;
// - seat 0, who opened the room, owns Sir's clock and sends {t:'sir'} with the score when he arrives;
// - nothing is lost to a dropped connection: game messages are numbered (n) and kept in an outbox, and on
//   reconnecting each side's hello says the last number it got, so the other sends what was missed.
// Seats are the match's player numbers: seat 0 is player 1 (blue side), seat 1 is player 2. Everything that
// arrives is checked before use, and names are shown as text only.
"use strict";

const ROOM_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',ROOM_RE=/^[A-HJ-NP-Z2-9]{5}$/;
const GONE_WAIT=30; // seconds a friend may be away mid-match before the game goes to the one who stayed
const mine=i=>G.mode==='online'?i===G.seat:!isCPU(i); // a player at this screen
// The shared random numbers for laying out each round (mulberry32: integer maths, the same in every browser).
function netRand(){let t=G.rngState=(G.rngState+0x6D2B79F5)>>>0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}

const online=(()=>{
  let ws=null,want=false,tries=0,timer=0,goneT=0,code='',status='idle',peerOn=false,again=[false,false],aimAt=0,restDone=false,invite=null,
    outN=0,inN=0,outbox=[],me='',peerId='';
  const on=()=>G.mode==='online';
  const num=(v,lo,hi)=>typeof v==='number'&&isFinite(v)&&v>=lo&&v<=hi;
  const r4=v=>Math.round(v*1e4)/1e4;

  /* ---------- connection ---------- */
  function connect(){
    clearTimeout(timer);
    if(!want||ws)return;
    try{ws=new WebSocket(`${WORKER_URL}/room/${code}?seat=${G.seat}`);}catch(e){ws=null;fail();return;}
    ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch(_){return;}if(m&&typeof m==='object')(m.sys?system(m):game(m));};
    ws.onclose=()=>{
      ws=null;peerOn=false;
      if(!want)return;
      if(tries>=6&&!G.matchLive){fail();return;} // can't reach the room: say so on the home screen
      if(G.matchLive)note('🔌 সংযোগ খুঁজছি…');
      timer=setTimeout(connect,Math.min(8000,700*2**tries++));
    };
  }
  function raw(m){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(m));}
  // A game message: numbered and kept until the friend has surely seen it (the last 64 are plenty for one turn).
  function send(m){m.n=++outN;outbox.push(m);if(outbox.length>64)outbox.shift();raw(m);}
  function fresh(){outN=inN=0;outbox=[];peerId='';me=Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>b.toString(16).padStart(2,'0')).join('');}
  function fail(){want=false;status='lost';ui();}
  function stop(){want=false;clearTimeout(timer);clearTimeout(goneT);if(ws){const w=ws;ws=null;w.onclose=null;w.close();}peerOn=false;}

  /* ---------- room ---------- */
  function host(){
    code=Array.from(crypto.getRandomValues(new Uint8Array(5)),b=>ROOM_CHARS[b%ROOM_CHARS.length]).join('');
    G.seat=0;G.peer=null;status='open';want=true;tries=0;fresh();connect();ui();
  }
  function join(){
    if(!invite)return;
    code=invite.code;G.seat=1;G.peer=null;status='joining';want=true;tries=0;fresh();connect();ui();
  }
  // Leaving on purpose: the friend is told, and wins if a match was on.
  function leave(){
    if(status==='idle'&&!want)return;
    raw({t:'bye'});stop();status='idle';invite=null;G.peer=null;
    if(G.matchLive&&on()){G.matchLive=false;G.pending=null;placeSir(-16,false,0);sirClock();live.update();}
    ui();
  }
  // ?room=CODE.name from a friend's link: switch to online play with the invite ready to accept.
  function readInvite(){
    const q=new URLSearchParams(location.search);if(!q.has('room'))return;
    const [c,name]=(q.get('room')||'').split('.');
    if(ROOM_RE.test(c||'')){let from='';try{from=cleanName(b64u.dec(name||''));}catch(e){}invite={code:c,from};status='invited';G.mode='online';G.challenge=null;}
    try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
  }
  function roomURL(){
    const base=/^https?:$/.test(location.protocol)?location.origin+location.pathname:siteBase();
    return base?`${base}?room=${code}.${b64u.enc(G.names[0]||'')}`:'';
  }
  async function shareLink(){
    const url=roomURL(),text=`${G.names[0]||'তোমার বন্ধু'} তোমাকে কলম যুদ্ধে ডাকছে! 🖊️ লিংকে এসে কলম বেছে যোগ দাও।`;
    if(!url)return;
    if(navigator.share&&matchMedia('(pointer:coarse)').matches){try{await navigator.share({title:'কলম যুদ্ধ',text,url});return;}catch(e){if(e.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(`${text}\n${url}`);$('#netNote').textContent='লিংক কপি হয়েছে। Messenger বা WhatsApp-এ পেস্ট করে পাঠাও।';}
    catch(e){$('#netUrl').select();$('#netNote').textContent='লিংকটা কপি করে বন্ধুকে পাঠাও।';}
  }

  /* ---------- messages from the room ---------- */
  function system(m){
    if(m.sys==='seat'){tries=0;if(status==='joining')status='waiting';note('');ui();}
    else if(m.sys==='full'){want=false;status='full';ui();}
    else if(m.sys==='peer'){
      peerOn=!!m.on;clearTimeout(goneT);
      if(peerOn){
        raw({t:'hi',id:me,got:inN,name:G.names[0],pen:G.p1,col:G.c1});
        if(G.matchLive){note('');toast('🔌 বন্ধু ফিরে এসেছে','');}
      } else if(G.matchLive){
        note(`🔌 ${poss(G.peer?G.peer.name:'বন্ধু')} সংযোগ নেই, অপেক্ষা করছি…`);
        goneT=setTimeout(()=>{if(G.matchLive&&!peerOn){note('');matchOver(G.seat,'left');}},GONE_WAIT*1000);
      }
      ui();
    }
  }
  function game(m){
    if(m.n!==undefined){if(!Number.isInteger(m.n)||m.n<=inN)return;inN=m.n;} // a numbered message seen before
    switch(m.t){
      case 'hi':{
        if(!byId(m.pen)||typeof m.id!=='string')return;
        if(m.id!==peerId){
          // a different page in the friend's seat (they reloaded): what this game knew of them is gone
          if(peerId&&G.matchLive){note('');matchOver(G.seat,'left');}
          peerId=m.id;inN=0;
        }
        if(Number.isInteger(m.got))outbox.filter(o=>o.n>m.got).forEach(raw); // what they missed while away
        G.peer={name:cleanName(String(m.name||''))||'বন্ধু',pen:m.pen,col:penDef(m.pen,m.col).color};
        if(G.seat===0&&status==='open')start(); // the friend is here: the match begins
        ui();break;
      }
      case 'start':if(G.seat===1)begin(m);break;
      case 'shot':{
        const t=1-G.seat,p=pens[t];
        if(!G.matchLive||G.state!=='remote'||G.turn!==t||!num(m.s,-p.L/2,p.L/2)||!num(m.dx,-1,1)||!num(m.dz,-1,1)||!num(m.power,0,1))return;
        G.armed=m.sup&&G.supers[t]>0?t:-1;G.aimVis=null;doShot(t,m.s,m.dx,m.dz,m.power);break;
      }
      case 'aim':{
        if(G.state!=='remote')return;
        G.aimVis=m.off||![m.cx,m.cz,m.px,m.pz].every(v=>num(v,-30,30))||!num(m.ang,-7,7)||!num(m.power,0,1)?null:{cx:m.cx,cz:m.cz,px:m.px,pz:m.pz,ang:m.ang,power:m.power,sup:!!m.sup};
        break;
      }
      case 'rest':if(G.matchLive&&G.turn!==G.seat&&(G.state==='moving'||G.state==='remote'))takeRest(m.poses);break;
      case 'sir':if(G.seat===1&&G.matchLive&&sir.phase!=='here'&&okScore(m.score)){G.score=m.score.slice();updateHUD();sirArrives();}break;
      case 'again':again[1-G.seat]=true;if(G.seat===0&&again[0]&&peerOn)start();ui();break;
      case 'bye':peerOn=false;if(G.matchLive){note('');matchOver(G.seat,'left');}ui();break;
    }
  }
  const okScore=s=>Array.isArray(s)&&s.length===2&&s.every(v=>Number.isInteger(v)&&v>=0&&v<=TARGET);
  const okPoses=ps=>Array.isArray(ps)&&ps.length===2&&ps.every(p=>Array.isArray(p)&&p.length===4&&num(p[0],-40,40)&&num(p[1],-40,40)&&num(p[2],-1e4,1e4));

  /* ---------- the match ---------- */
  // Seat 0 starts every match: the settings, both pens (seat 1 takes the next colour if they are the same) and the seed.
  function start(){
    if(!G.peer)return;
    const p0=penDef(G.p1,G.c1);let p1=penDef(G.peer.pen,G.peer.col);
    if(p1.id===p0.id&&p1.color===p0.color){const cs=p1.colors,k=cs.findIndex(c=>c[0]===p1.color);p1=penDef(p1.id,cs[(k+1)%cs.length][0]);}
    const m={t:'start',seed:crypto.getRandomValues(new Uint32Array(1))[0],sir:G.sirOn,tiffin:G.tiffin,pens:[[p0.id,p0.color],[p1.id,p1.color]],names:[G.names[0],G.peer.name]};
    send(m);begin(m);
  }
  function begin(m){
    if(!Array.isArray(m.pens)||m.pens.length!==2||!m.pens.every(p=>Array.isArray(p)&&byId(p[0]))||!Number.isInteger(m.seed))return;
    again=[false,false];status='play';note('');
    G.net={sir:!!m.sir,tiffin:TIFFINS.includes(m.tiffin)?m.tiffin:2,pens:m.pens.map(p=>penDef(p[0],p[1]))};
    if(G.seat===1&&Array.isArray(m.names))G.peer=Object.assign(G.peer||{},{name:cleanName(String(m.names[0]||''))||'বন্ধু'});
    G.rngState=m.seed>>>0;
    $('#menu').hidden=true;$('#endScreen').hidden=true;$('#sheet').hidden=true;
    setupMatch();
  }
  // The shooter's word on where the pens ended. A pen that fell here but not there is put back, and the other way round.
  function takeRest(ps){
    if(!okPoses(ps))return;
    ps.forEach((q,i)=>{
      const p=pens[i],out=!!q[3];
      if(out){if(!p.out){p.x=q[0];p.z=q[1];p.out=true;startFall(i);}}
      else{
        if(p.out){p.out=false;p.falling=null;if(meshes[i])meshes[i].inner.rotation.set(0,0,0);}
        p.x=q[0];p.z=q[1];p.a=q[2];
      }
      p.vx=p.vz=p.w=0;
    });
    if(G.state==='remote')G.state='moving';
    restDone=true;
  }
  // Called by the frame loop once the pens have settled: may the turn end here?
  function canEnd(){
    if(!on())return true;
    if(G.turn===G.seat){send({t:'rest',poses:pens.map(p=>[r4(p.x),r4(p.z),r4(p.a),p.out?1:0])});return true;}
    return restDone;
  }
  function turnStarted(){restDone=false;}
  // Sir arrives on seat 0's clock; seat 1 waits for the word (see sirTick).
  const ownsClock=()=>!on()||G.seat===0;
  function sirCame(){if(on()&&G.seat===0)send({t:'sir',score:G.score});}
  function shot(i,s,dx,dz,power,sup){if(on()&&i===G.seat)send({t:'shot',s:r4(s),dx,dz,power,sup:!!sup});}
  // The aim arrow, at most ~12 times a second, so the friend can watch the pull.
  function aim(v){
    if(!on()||G.turn!==G.seat)return;
    const now=performance.now();
    if(!v){if(aimAt){aimAt=0;raw({t:'aim',off:1});}return;} // the arrow is not worth resending: raw
    if(now-aimAt<80)return;aimAt=now;
    raw({t:'aim',cx:r4(v.cx),cz:r4(v.cz),px:r4(v.px),pz:r4(v.pz),ang:r4(v.ang),power:r4(v.power),sup:!!v.sup});
  }
  function over(){status='over';again=[false,false];clearTimeout(goneT);note('');ui();}
  function rematch(){
    if(!peerOn){ui();return;}
    again[G.seat]=true;send({t:'again'});
    if(G.seat===0&&again[1])start();
    ui();
  }

  /* ---------- screens ---------- */
  function note(t){const n=$('#netHud');n.textContent=t;n.hidden=!t;}
  function ui(){
    if(!$('#netBox'))return;
    const show=on()&&!G.matchLive,box=$('#netBox');box.hidden=!show;
    const who=G.peer?G.peer.name:'বন্ধু';
    const txt={
      idle:'রুম খুললে একটা লিংক পাবে। সেটা বন্ধুকে পাঠাও, সে লিংকে এসে কলম বেছে যোগ দেবে।',
      open:peerOn?`${who} এসেছে!`:'⏳ বন্ধুর অপেক্ষায়… এই লিংকটা বন্ধুকে পাঠাও:',
      invited:`🎯 ${invite&&invite.from?invite.from:'তোমার বন্ধু'} তোমাকে অনলাইনে খেলতে ডেকেছে! কলম বেছে “যোগ দাও” চাপো।`,
      joining:'⏳ রুমে ঢুকছি…',
      waiting:peerOn?`⏳ ${who} খেলা শুরু করছে…`:'⏳ যে ডেকেছে সে এখন রুমে নেই। একটু অপেক্ষা করো, নয়তো নিজেই রুম খোলো।',
      full:'এই রুমে আগেই দুজন আছে। নিজে একটা রুম খুলে বন্ধুকে ডাকো।',
      lost:'রুমে পৌঁছানো গেল না। ইন্টারনেট দেখে আবার চেষ্টা করো।',
      over:peerOn?`${who} এখনও রুমে আছে, আবার খেলতে পারো।`:`${who} রুম থেকে চলে গেছে।`,
      play:'',
    }[status]||'';
    $('#netText').textContent=txt;
    const linkOn=show&&status==='open'&&!peerOn;$('#netLink').hidden=!linkOn;if(linkOn)$('#netUrl').value=roomURL();
    if(!linkOn)$('#netNote').textContent='';
    $('#bNetCancel').hidden=!(want||status==='invited');$('#bNetCancel').textContent=status==='invited'?'ডাক বাদ দাও':'রুম ছেড়ে দাও';
    const b=$('#bRematch');
    if(on()&&b){
      const waiting=again[G.seat]&&!again[1-G.seat];
      b.disabled=!peerOn||waiting;
      b.textContent=!peerOn?`${who} চলে গেছে`:waiting?`⏳ ${poss(who)} অপেক্ষায়…`:again[1-G.seat]?`▶ ${who} আবার খেলতে চায়!`:'▶ আবার খেলো';
    }
    if(typeof refreshMenu==='function'&&!$('#menu').hidden)syncStart();
  }
  // The home screen's ▶ button in online mode.
  function syncStart(){
    const b=$('#bStart');if(!on())return;
    b.disabled=['open','joining','waiting'].includes(status);
    b.textContent=status==='invited'?'▶ যোগ দাও':b.disabled?'⏳ বন্ধুর অপেক্ষায়…':status==='idle'?'▶ রুম খুলে বন্ধুকে ডাকো':'▶ নতুন রুম খোলো';
  }
  function startPressed(){if(status==='invited')join();else{stop();invite=null;host();}}
  function wire(){
    $('#bNetShare').onclick=shareLink;
    $('#bNetCancel').onclick=()=>{leave();refreshMenu();};
    $('#netUrl').onfocus=e=>e.target.select();
  }
  return {readInvite,wire,ui,syncStart,startPressed,leave,canEnd,turnStarted,ownsClock,sirCame,shot,aim,over,rematch,
    ready:()=>!on()||peerOn,status:()=>status};
})();

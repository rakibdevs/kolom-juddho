// Challenge links: "আমাকে হারাতে পারবে?" After a match against the computer, a player sends a link that
// carries their name, pen, colour, level and score. The friend who opens it plays the computer playing as
// that player, with their pen at their level, and can send a challenge back. Everything rides in the URL;
// there is no server. Query values are untrusted: they are validated here and shown only as text.
"use strict";

const LEVELS={easy:'নতুন',medium:'মোটামুটি',hard:'ওস্তাদ'};
// Links carry one short code, ?c=pen.colour.level.score.name, with the name as base64url UTF-8 so Bangla
// stays short (e.g. ?c=econo.blue.m.31.4Kaw4Ka-4KaV4Ka_4Kas for রাকিব). Older long links (?from=&pen=&col=&lvl=&score=)
// still work.
const LV={e:'easy',m:'medium',h:'hard'};
const b64u={
  enc:s=>btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),
  dec:s=>new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))),
};
// Reads the challenge into G.challenge, then drops the query so a reload starts clean.
function readChallenge(){
  const q=new URLSearchParams(location.search);let v=null;
  if(q.has('c')){
    const [pen,col,lv,sc,name]=(q.get('c')||'').split('.');
    try{v={from:b64u.dec(name||''),pen,col,lvl:LV[lv],score:/^[0-3]{2}$/.test(sc||'')?`${sc[0]}-${sc[1]}`:''};}catch(e){}
  } else if(q.has('from'))v={from:q.get('from'),pen:q.get('pen'),col:q.get('col'),lvl:q.get('lvl'),score:q.get('score')||''};
  if(v){
    const from=cleanName(v.from);
    if(from&&byId(v.pen)&&LEVELS[v.lvl]){
      G.challenge={from,pen:v.pen,col:penDef(v.pen,v.col).color,lvl:v.lvl,score:/^[0-3]-[0-3]$/.test(v.score)?v.score:''};
      G.mode='cpu';
    }
  }
  if(q.has('c')||q.has('from'))try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
}
function dropChallenge(){G.challenge=null;refreshBoard();refreshMenu();}
// The challenger's pen; if the player picked the very same pen and colour, the challenger takes the next colour.
function challengePen(){
  const c=G.challenge,d=penDef(c.pen,c.col);
  if(c.pen!==G.p1||d.color!==G.c1)return d;
  const cs=d.colors,k=cs.findIndex(x=>x[0]===d.color);return penDef(c.pen,cs[(k+1)%cs.length][0]);
}
// The home screen's banner for an incoming challenge.
function syncChallengeBanner(){
  const c=G.challenge,b=$('#chBanner');b.hidden=!c;if(!c)return;
  const [a,z]=c.score?c.score.split('-'):[];
  $('#chTitle').textContent=`🎯 ${c.from} তোমাকে চ্যালেঞ্জ করেছে!`;
  $('#chText').textContent=`${c.from} খেলবে ${byId(c.pen).name} নিয়ে, ${LEVELS[c.lvl]} লেভেলে।${c.score?` ওর আজকের রেকর্ড ${toBn(a)}–${toBn(z)}।`:''} পারবে হারাতে?`;
}

// Sending: a link to the public site (siteBase in js/share.js).
function challengeURL(){
  const base=siteBase(),d=pens[0].def;if(!base)return '';
  const lv=Object.keys(LV).find(k=>LV[k]===level());
  return `${base}?c=${[d.id,d.color,lv,`${G.score[0]}${G.score[1]}`,b64u.enc(G.names[0])].join('.')}`;
}
function challengeText(){
  const won=G.score[0]>G.score[1],d=pens[0].def;
  return `কলম যুদ্ধে আমাকে হারাতে পারবে? 🖊️ আমি খেলব ${d.name} নিয়ে${won?`, আজ ${rival()}কে ${toBn(G.score[0])}–${toBn(G.score[1])} হারিয়েছি`:''}।`;
}
async function sendChallenge(){
  // the friend should know who challenged them, so a name is needed
  const name=cleanName($('#chName').value);
  if(!name){$('#chName').focus();shareNote('আগে তোমার নাম লেখো, যাতে বন্ধু বুঝতে পারে কে চ্যালেঞ্জ করেছে।');return;}
  if(name!==G.names[0]){G.names[0]=name;saveNames();}
  const url=challengeURL(),text=challengeText();
  if(!url){shareNote('লিংক বানাতে গেমটা ওয়েবসাইট থেকে খোলো।');return;}
  // phones: the share sheet (Messenger, WhatsApp, Facebook); desktops: copy the link
  if(navigator.share&&matchMedia('(pointer:coarse)').matches){
    try{await navigator.share({title:'কলম যুদ্ধ',text,url});return;}catch(e){if(e.name==='AbortError')return;}
  }
  try{await navigator.clipboard.writeText(`${text}\n${url}`);shareNote('চ্যালেঞ্জের লিংক কপি হয়েছে। Messenger, WhatsApp বা Facebook-এ পেস্ট করে বন্ধুকে পাঠাও।');}
  catch(e){shareNote(`এই লিংকটা বন্ধুকে পাঠাও: ${url}`);}
}

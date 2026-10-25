// Challenge links: "আমাকে হারাতে পারবে?" After a match against the computer, a player sends a link that
// carries their name, pen, colour, level and score. The friend who opens it plays the computer playing as
// that player, with their pen at their level, and can send a challenge back. Everything rides in the URL;
// there is no server. Query values are untrusted: they are validated here and shown only as text.
"use strict";

const LEVELS={easy:'নতুন',medium:'মোটামুটি',hard:'ওস্তাদ'};
// Reads ?from=&pen=&col=&lvl=&score= into G.challenge, then drops the query so a reload starts clean.
function readChallenge(){
  const q=new URLSearchParams(location.search);
  if(q.has('from')){
    const from=cleanName(q.get('from')),pen=q.get('pen'),lvl=q.get('lvl'),score=q.get('score')||'';
    if(from&&byId(pen)&&LEVELS[lvl]){
      G.challenge={from,pen,col:penDef(pen,q.get('col')).color,lvl,score:/^[0-3]-[0-3]$/.test(score)?score:''};
      G.mode='cpu';
    }
    try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
  }
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

// Sending: a link to this page with the player's name, pen and level, and the score of the match just played.
function challengeURL(){
  if(!location.protocol.startsWith('http'))return '';
  const d=pens[0].def,q=new URLSearchParams({from:G.names[0]||'একজন বন্ধু',pen:d.id,col:d.color,lvl:level(),score:`${G.score[0]}-${G.score[1]}`});
  return `${location.origin}${location.pathname.replace(/index\.html$/,'')}?${q}`;
}
function challengeText(){
  const won=G.score[0]>G.score[1],d=pens[0].def;
  return `কলম যুদ্ধে আমাকে হারাতে পারবে? 🖊️ আমি খেলব ${d.name} নিয়ে${won?`, আজ ${rival()}কে ${toBn(G.score[0])}–${toBn(G.score[1])} হারিয়েছি`:''}।`;
}
async function sendChallenge(){
  const url=challengeURL(),text=challengeText();
  if(!url){shareNote('লিংক বানাতে গেমটা ওয়েবসাইট থেকে খোলো।');return;}
  // phones: the share sheet (Messenger, WhatsApp, Facebook); desktops: copy the link
  if(navigator.share&&matchMedia('(pointer:coarse)').matches){
    try{await navigator.share({title:'কলম যুদ্ধ',text,url});return;}catch(e){if(e.name==='AbortError')return;}
  }
  try{await navigator.clipboard.writeText(`${text}\n${url}`);shareNote('চ্যালেঞ্জের লিংক কপি হয়েছে। Messenger, WhatsApp বা Facebook-এ পেস্ট করে বন্ধুকে পাঠাও।');}
  catch(e){shareNote(`এই লিংকটা বন্ধুকে পাঠাও: ${url}`);}
}

// Live player count on the home screen's chalkboard: "🟢 এখন অনলাইন ১২ জন · খেলছে ৫ জন", and under it how
// many matches have ever been played ("🎮 মোট খেলা ১২৩৪ বার · অনলাইনে ৫৬ বার"). The game keeps a WebSocket
// open to the Cloudflare Worker in worker/ and tells it only whether this tab is in a match, and what kind of
// match when one starts (the mode, and against the computer the level and whether it is a challenge), which
// the Worker counts per day. An online match is counted by the player who opened the room only.
// Off when LIVE_URL is empty; hidden while offline or disconnected, and it retries with a growing delay.
"use strict";

const live=(()=>{
  let ws=null,tries=0,timer=0;
  function connect(){
    clearTimeout(timer);
    if(!LIVE_URL||ws||!navigator.onLine)return;
    try{ws=new WebSocket(LIVE_URL);}catch(e){ws=null;return;}
    ws.onopen=()=>{tries=0;update();};
    ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(Number.isInteger(m.online)&&Number.isInteger(m.playing))show(m);}catch(_){}};
    ws.onclose=()=>{ws=null;show(null);timer=setTimeout(connect,Math.min(60000,3000*2**tries++));};
  }
  // Called when a match starts or ends; started is true only from setupMatch, so a reconnect isn't a new match.
  function update(started){
    if(!ws||ws.readyState!==WebSocket.OPEN)return;
    const m={playing:!!G.matchLive};
    if(started&&G.matchLive&&(G.mode!=='online'||G.seat===0))Object.assign(m,{start:G.mode},G.mode==='cpu'&&{level:level(),ch:G.challenge?1:0});
    ws.send(JSON.stringify(m));
  }
  function show(m){
    const el=$('#live'),st=$('#plays');el.hidden=!m||m.online<1;
    st.hidden=!m||!(m.total>0);
    if(!st.hidden)st.textContent=`🎮 মোট খেলা ${toBn(m.total)} বার${m.net>0?` · অনলাইনে ${toBn(m.net)} বার`:''}`;
    if(!el.hidden)el.textContent=`🟢 এখন অনলাইন ${toBn(m.online)} জন${m.playing?` · খেলছে ${toBn(m.playing)} জন`:''}`;
  }
  addEventListener('online',connect);
  addEventListener('offline',()=>{if(ws)ws.close();});
  return {connect,update};
})();

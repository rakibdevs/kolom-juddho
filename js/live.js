// Live player count on the home screen's chalkboard: "🟢 এখন অনলাইন ১২ জন · খেলছে ৫ জন". The game keeps
// a WebSocket open to the Cloudflare Worker in worker/ and tells it only whether this tab is in a match.
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
  // Called when a match starts or ends.
  function update(){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({playing:!!G.matchLive}));}
  function show(m){
    const el=$('#live');el.hidden=!m||m.online<1;if(el.hidden)return;
    el.textContent=`🟢 এখন অনলাইন ${toBn(m.online)} জন${m.playing?` · খেলছে ${toBn(m.playing)} জন`:''}`;
  }
  addEventListener('online',connect);
  addEventListener('offline',()=>{if(ws)ws.close();});
  return {connect,update};
})();

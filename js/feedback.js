// অনুভূতি: the feedback form in the sheet. A rating (one of five faces), a note and an optional name go to the
// Worker's /feedback (FEEDBACK_URL), which keeps them in a D1 database. The unsent note is remembered on this
// device until it is sent, so closing the sheet or going offline doesn't lose it.
"use strict";

const feedback=(()=>{
  const DRAFT_KEY='kolom-juddho:feedback',MAX=1000;
  const RATES=['','একদম ভালো লাগেনি','তেমন না','মোটামুটি','ভালো লেগেছে','দারুণ!'];
  let rating=0,busy=false;
  const say=(t,ok)=>{const s=$('#fbStatus');s.textContent=t;s.classList.toggle('ok',!!ok);};
  function showRate(){
    document.querySelectorAll('#segRate button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.v===rating));
    $('#fbRateText').textContent=RATES[rating];
  }
  function count(){const n=$('#fbText').value.length;$('#fbCount').textContent=`${toBn(n)}/${toBn(MAX)}`;}
  function saveDraft(){try{localStorage.setItem(DRAFT_KEY,JSON.stringify({rating,text:$('#fbText').value}));}catch(e){}}
  function loadDraft(){
    try{const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}');
      if(Number.isInteger(d.rating)&&d.rating>=0&&d.rating<=5)rating=d.rating;
      if(typeof d.text==='string')$('#fbText').value=d.text.slice(0,MAX);
    }catch(e){}
  }
  // Called when the sheet opens on this tab: fill in the player's name if they haven't typed one.
  function opened(){const n=$('#fbName');if(!n.value)n.value=G.names[0]||'';count();}
  async function send(e){
    e.preventDefault();if(busy)return;
    const text=$('#fbText').value.trim();
    if(!text&&!rating){say('আগে একটা মুখ বাছো বা কিছু লেখো।');$('#fbText').focus();return;}
    if(!navigator.onLine){say('ইন্টারনেট নেই। লেখাটা রেখে দিলাম, পরে আবার পাঠিও।');return;}
    busy=true;const b=$('#bFbSend');b.disabled=true;b.textContent='পাঠানো হচ্ছে…';say('');
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
    try{
      const r=await fetch(FEEDBACK_URL,{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,
        body:JSON.stringify({rating:rating||null,text,name:cleanName($('#fbName').value),mode:G.mode,view:G.view,pen:G.p1,website:$('#fbWeb').value})});
      if(r.ok){
        rating=0;$('#fbText').value='';showRate();count();try{localStorage.removeItem(DRAFT_KEY);}catch(e){}
        say('ধন্যবাদ! তোমার কথা পৌঁছে গেছে। 🙏',true);
      }else say(r.status===429?'একটু বেশি তাড়াতাড়ি পাঠাচ্ছ। এক মিনিট পরে আবার চেষ্টা করো।':'এখন পাঠানো গেল না। লেখাটা রেখে দিলাম, পরে আবার চেষ্টা করো।');
    }catch(err){say('পাঠানো গেল না। লেখাটা রেখে দিলাম, পরে আবার চেষ্টা করো।');}
    finally{clearTimeout(timer);busy=false;b.disabled=false;b.textContent='✉️ পাঠাও';}
  }
  function wire(){
    loadDraft();showRate();count();
    $('#segRate').onclick=e=>{const b=e.target.closest('button');if(!b)return;const v=+b.dataset.v;rating=rating===v?0:v;showRate();saveDraft();say('');}; // a second tap clears it
    $('#fbText').oninput=()=>{count();saveDraft();};
    $('#fbForm').onsubmit=send;
  }
  return {wire,opened};
})();

// Constants, pen catalogue, shared helpers and game state.
"use strict";

const DAIS=1.2, TOP=DAIS+7.5, HX=7, HZ=4;
const FRIC=6.5, LDAMP=0.5, AFRIC=10, ADAMP=1.8, REST=0.55, MU=0.25, SPIN=0.3;
const TARGET=3, CPU='রাশেদ';
// ⚡ সুপার টোকা: a human player earns SUPER_USES the first time they win a round in a match. An armed flick leaves `speed` times faster and hits
// as if `mass` times heavier; on its first hit it keeps only `keep` of its speed and its grip rises `grip`
// times, so it punches the other pen away but stays on the table itself.
const SUPER={speed:1.35,mass:2.4,keep:.4,grip:3}, SUPER_USES=1;
// Each pen is drawn capped, the way it lies on a desk, from parts in the real pen's colours (see drawPen2D and
// makePenMesh): barrel `body` (`hex` six-sided, `clear` see-through with the `ink` refill inside), optional
// `rubber` grip, printed `label` in `labelInk`, end plug `end`, and the `cap` (`capLen` share of the length,
// `capMetal` steel, `capClear` see-through) with a lip ring `capRing` and a `clip` (`clipLen` from the top).
// `trim` gilds the ring, clip and end band. Under a clear cap the grip section shows: `nose` colour, `noseLen`,
// `noseClear` (tinted see-through, refill inside), cone and `tip`. Never add logos; `label` is plain text.
// `short` labels the pen on the home screen. `colors` lists the colours a player can pick as [id, Bangla name, hex], and `paint` maps the
// picked hex onto the parts that change colour. `brand` feeds the credit note on the home screen.
// m, L, r, speed and grip are physics stats: keep speed at or below about 18.
// Sizes follow the real pens at about 1 world unit = 10 cm (L is length, r is barrel radius). Colours are #rrggbb.
const PENS=[
 // Econo DX, from a photo: opaque six-sided barrel, black cap, clip and end, "ECONO DX" printed along it
 {id:'econo',name:'Econo DX',short:'Econo DX',bn:'ইকোনো ডিএক্স',brand:'Econo',tag:'হালকা আর চটপটে, সবার প্রথম কলম',
  cap:'#1b1b1d',clip:'#1b1b1d',end:'#1b1b1d',capLen:.27,clipLen:.24,hex:true,label:'ECONO DX',
  colors:[['white','সাদা','#f2f2ee'],['yellow','হলুদ','#f0c020'],['blue','নীল','#2f6fd6'],['black','কালো','#2b2b2e']],
  paint:c=>({body:c,ink:c,labelInk:c==='#2b2b2e'?'#e6e6e6':'#141414'}),
  m:1.0,L:1.42,r:0.05,speed:18,grip:1.0},
 // Matador Pin-Point, from product photos: slim opaque barrel in a bright colour, a see-through tinted grip
 // at the needle tip, clear cap and clip, "MATADOR PIN-POINT" printed in black
 {id:'pinpoint',name:'Matador Pin-Point',short:'Pin-Point',bn:'ম্যাটাডোর পিন-পয়েন্ট',brand:'Matador',tag:'চিকন সুঁইয়ের মতো মাথা, ঝলমলে রং — ব্যালান্সড',
  cap:'#e4ebef',capClear:true,clip:'#e4ebef',end:'#cfd6db',tip:'#9aa0a8',ink:'#1d1d1f',noseClear:true,noseLen:.13,capLen:.3,clipLen:.27,label:'MATADOR PIN-POINT',labelInk:'#141414',
  colors:[['yellow','হলুদ','#f6b324'],['pink','গোলাপি','#ea2f8a'],['purple','বেগুনি','#8b3a9e'],['green','সবুজ','#5bbd3a'],['sky','আকাশি','#3db2e6']],
  paint:c=>({body:c,nose:c}),
  m:1.25,L:1.42,r:0.048,speed:16.5,grip:1.1},
 // Matador Hi-School, from product photos: see-through barrel tinted in a bright colour with the refill showing,
 // a cap in the same colour with a chrome band at its lip
 {id:'hischool',name:'Matador Hi-School',short:'Hi-School',bn:'ম্যাটাডোর হাই-স্কুল',brand:'Matador',tag:'স্বচ্ছ রঙিন বডি, রুপালি মাথা — ভারী আর স্থির',
  clear:true,ink:'#1c1c1c',capRing:'#cfd4d9',capLen:.3,clipLen:.27,
  colors:[['red','লাল','#e2312b'],['green','সবুজ','#2fae4a'],['blue','নীল','#2a62d6'],['pink','গোলাপি','#ec5a9a'],['violet','বেগুনি','#7a3fc4'],['yellow','হলুদ','#f2c81e']],
  paint:c=>({body:mixHex(c,'#ffffff',.15),cap:c,clip:c,end:c}),
  m:1.55,L:1.45,r:0.062,speed:15,grip:1.25},
 // Linc Pentonic: slim matte-black barrel and cap, clip and tip ring in the ink colour (as the maker's catalogue describes it)
 {id:'linc',name:'Linc Pentonic',short:'Linc',bn:'লিংক পেন্টোনিক',brand:'Linc',tag:'চিকন কালো বডি — হালকা, নিশানা সহজ',
  body:'#1c1c1e',cap:'#1c1c1e',end:'#1c1c1e',label:'LINC PENTONIC',labelInk:'#c9ccd1',
  colors:[['blue','নীল','#2456c8'],['black','কালো','#5a5d63'],['red','লাল','#d1342f'],['green','সবুজ','#1f8a4c']],
  paint:c=>({clip:c,capRing:c,ink:c}),
  m:1.1,L:1.42,r:0.048,speed:17.5,grip:1.0},
 // Cello Gripper: transparent barrel, cap and clip, the refill showing, and a rubber grip in the ink colour
 // (as retailers describe it; no photo yet)
 {id:'cello',name:'Cello Gripper',short:'Cello',bn:'সেলো গ্রিপার',brand:'Cello',tag:'স্বচ্ছ বডিতে রিফিল দেখা যায়, রাবার গ্রিপে হাত পিছলায় না',
  body:'#e6eef2',clear:true,cap:'#e6eef2',capClear:true,clip:'#e6eef2',tip:'#c2c6cc',noseLen:.12,
  colors:[['blue','নীল','#1f4fc4'],['black','কালো','#1d1d1f'],['red','লাল','#d1342f'],['green','সবুজ','#1f8a4c']],
  paint:c=>({ink:c,rubber:c,nose:c,end:c}),
  m:1.3,L:1.42,r:0.056,speed:16,grip:1.2},
 // RFL Good Luck (fine ball), from a product photo: slim frosted see-through barrel in a light tint, the cap and
 // long clip in the full colour, "GOOD LUCK UNIVERSITY" printed in white
 {id:'goodluck',name:'RFL Good Luck',short:'Good Luck',bn:'আরএফএল গুড লাক',brand:'RFL',tag:'দেশি ফাইন বল — হালকা স্বচ্ছ বডি, টোকায় চটপটে',
  clear:true,ink:'#2c2c3a',capLen:.27,clipLen:.31,label:'GOOD LUCK UNIVERSITY',labelInk:'#f6f6f2',
  colors:[['violet','বেগুনি','#3d2c66'],['green','সবুজ','#6fd86a'],['pink','গোলাপি','#ef6fb2'],['orange','কমলা','#f47a2a'],['sky','আকাশি','#3db6e6']],
  paint:c=>({cap:c,clip:c,end:c,body:mixHex(c,'#ffffff',.3)}),
  m:1.1,L:1.42,r:0.046,speed:17,grip:1.05},
 {id:'hero',name:'Hero Fountain Pen',short:'Hero',bn:'হিরো ঝর্ণা কলম',brand:'Hero',tag:'ভারী ধাতব ট্যাংক — ধীর, কিন্তু মারলে শেষ',
  trim:'#d4af37',capLen:.36,clipLen:.3,label:'HERO',labelInk:'#d4af37',
  colors:[['black','কালো','#18191b'],['maroon','মেরুন','#5e1a22'],['blue','নীল','#1d3566'],['green','সবুজ','#1d4a35']],
  paint:c=>({body:c,cap:c,ink:c}),
  m:2.1,L:1.36,r:0.07,speed:13,grip:1.4},
 // Hero 616: steel cap with an arrow clip over a coloured barrel
 {id:'hero616',name:'Hero 616',short:'Hero 616',bn:'হিরো ৬১৬',brand:'Hero',tag:'স্টিলের ক্যাপ, ছোট নিব — হাতের লেখার খাতার সঙ্গী',
  cap:'#cfd3d8',capMetal:true,clip:'#e6e9ec',capLen:.4,clipLen:.34,
  colors:[['black','কালো','#1b1b1d'],['blue','নীল','#24489a'],['red','লাল','#b3262b'],['green','সবুজ','#2f6b45']],
  paint:c=>({body:c,ink:c,end:c}),
  m:1.6,L:1.36,r:0.06,speed:14.5,grip:1.3}
];
const PEN_W2D=1.6; // 2D drawings widen pens by this much (see drawPen2D)
const byId=id=>PENS.find(p=>p.id===id);
// Rashed's name can be changed on the home screen; CPU is the default.
// The computer's name and level; an incoming challenge (js/challenge.js) plays as the challenger.
const rival=()=>(G.challenge&&G.challenge.from)||G.rival||CPU;
const level=()=>(G.challenge&&G.challenge.lvl)||G.diff;
// Bangla genitive: রাশেদ → রাশেদের, মিতু → মিতুর, প্লেয়ার ১ → প্লেয়ার ১-এর; names in other scripts get -এর.
function poss(n){const c=n.slice(-1);if(!/[\u0980-\u09FF]/.test(c)||/[\u09E6-\u09EF]/.test(c))return n+'-এর';return n+(/[\u09BE-\u09CC\u0985-\u0994]/.test(c)?'র':'ের');}
// A pen definition in one of its colours. An unknown colour falls back to the pen's first one.
// Blends two #rrggbb colours: k = 0 gives a, 1 gives b. Used for tinted see-through barrels.
function mixHex(a,b,k){const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*k).toString(16).padStart(2,'0')).join('');}
function penDef(id,color){const b=byId(id),c=b.colors.find(k=>k[0]===color)||b.colors[0];return Object.assign({},b,b.paint(c[2]),{color:c[0],colorBn:c[1]});}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const $=s=>document.querySelector(s);
const toBn=n=>String(n).replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[d]);
// Canvas fonts. Keep in step with --font-ui and --font-chalk in css/style.css and the Google Fonts link.
// What the computer says in a speech bubble, by event (see say() in js/flow.js). One line is picked at
// random; at most one line per turn. Lines are spoken by whatever the player renamed him to.
const LINES={
  start:['আয়, দেখি কার কলমে জোর বেশি!','টিফিন শেষের আগেই তোর কলম টেবিলের নিচে!','আজ কিন্তু ছাড়ব না।'],
  turn:['দেখ এবার কেমন মারি!','চুপ, মন দিয়ে মারছি।','এইবার নিশানা ঠিক আছে।','একটু সরে দাঁড়া তো…'],
  knock:['ঠাস! কেমন লাগল?','যা, টেবিলের নিচে খোঁজ!','হা হা, এক টোকায় শেষ!'],
  self:['ধুর! হাত ফসকে গেল।','এটা গোনায় ধরিস না!','টেবিলটাই বাঁকা…'],
  oops:['নিজের কলম নিজেই ফেলে দিলি!','হা হা, নিজের গোলে নিজেই!'],
  lost:['উফ! আরেকবার, এবার দেখাব।','ভাগ্য ভালো তোর।','ঠিক আছে, এবার আমার পালা দেখিস।'],
  close:['ইশ্‌, আরেকটু হলেই!','অল্পের জন্য বেঁচে গেলি!'],
  saved:['বাপরে! অল্পের জন্য বাঁচলাম।','কিনারায় ঝুলছে, কিন্তু পড়েনি!'],
  super:['এটা কিন্তু চিটিং! ⚡','ওরে বাবা, সুপার টোকা!'],
};
const FONT_UI='"Baloo Da 2", sans-serif', FONT_CHALK='"Atma", "Baloo Da 2", cursive';
// Today's date as it would be chalked on the board, e.g. ২৪.১০.২০২৬ and শনিবার.
function todayBn(){const d=new Date(),z=n=>String(n).padStart(2,'0');return toBn(`${z(d.getDate())}.${z(d.getMonth()+1)}.${d.getFullYear()}`);}
const weekdayBn=()=>['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'][new Date().getDay()];

const G={mode:'cpu',diff:'medium',view:'3d',names:['',''],rival:'',superGot:[false,false],challenge:null,turnNo:0,saidAt:-1,p1:'econo',p2:'pinpoint',c1:'blue',c2:'red',score:[0,0],supers:[0,0],armed:-1,turn:0,starter:0,state:'menu',restT:0,matchLive:false,cpuAnim:null,aimVis:null};
let pens=[],meshes=[],rings=[],muted=false,has3D=true;

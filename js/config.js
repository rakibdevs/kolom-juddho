// Constants, pen catalogue, shared helpers and game state.
"use strict";

const DAIS=1.2, TOP=DAIS+7.5, HX=7, HZ=4;
const FRIC=6.5, LDAMP=0.5, AFRIC=10, ADAMP=1.8, REST=0.55, MU=0.25, SPIN=0.3;
const TARGET=3, CPU='রাশেদ';
// Each pen is drawn from its parts (tip or nib, body, nose ring, rubber grip, cap, clip, gold trim)
// in the colours of the real pen. `label` is plain text printed on the barrel; never add logos.
// `colors` lists the colours a player can pick as [id, Bangla name, hex], and `paint` maps the
// picked hex onto the parts that change colour. `brand` feeds the credit note on the home screen.
// m, L, r, speed and grip are physics stats: keep speed at or below about 18.
const PENS=[
 {id:'econo',name:'Econo DX',bn:'ইকোনো ডিএক্স',brand:'Econo',tag:'হালকা আর চটপটে, সবার প্রথম কলম',
  body:'#e8eef3',clear:true,hex:true,tip:'#c6cad0',label:'ECONO DX',labelInk:'#2a3140',
  colors:[['blue','নীল','#1f4fc4'],['black','কালো','#1d1d1f'],['red','লাল','#d1342f'],['green','সবুজ','#1f8a4c']],
  paint:c=>({cap:c,ink:c,clip:c}),
  m:1.0,L:1.40,r:0.055,speed:18,grip:1.0},
 {id:'pinpoint',name:'Matador Pinpoint',bn:'ম্যাটাডোর পিনপয়েন্ট',brand:'Matador',tag:'ব্যালান্সড, সব দিকেই ভালো',
  body:'#f6f4ee',tip:'#b8bcc2',label:'MATADOR PINPOINT',labelInk:'#2a3140',
  colors:[['red','লাল','#d1342f'],['blue','নীল','#1f4fc4'],['black','কালো','#1d1d1f'],['green','সবুজ','#1f8a4c']],
  paint:c=>({cap:c,ink:c,clip:c,nose:c}),
  m:1.25,L:1.46,r:0.058,speed:16.5,grip:1.1},
 {id:'hischool',name:'Matador Hi-School',bn:'ম্যাটাডোর হাই-স্কুল',brand:'Matador',tag:'রাবার গ্রিপ, সহজে নড়ে না',
  cap:'#1c1c1c',clip:'#6a6a6a',ink:'#1c1c1c',tip:'#b8bcc2',rubber:'#232323',label:'Hi-School',labelInk:'#f4f2ea',
  colors:[['green','সবুজ','#2f8f5b'],['blue','নীল','#2a5bb8'],['red','লাল','#b8322d'],['yellow','হলুদ','#d9a520']],
  paint:c=>({body:c}),
  m:1.55,L:1.5,r:0.064,speed:15,grip:1.25},
 {id:'hero',name:'Hero Fountain Pen',bn:'হিরো ঝর্ণা কলম',brand:'Hero',tag:'ভারী ধাতব ট্যাংক — ধীর, কিন্তু মারলে শেষ',
  trim:'#d4af37',tip:'#d4af37',nib:true,label:'HERO',labelInk:'#d4af37',
  colors:[['black','কালো','#18191b'],['maroon','মেরুন','#5e1a22'],['blue','নীল','#1d3566'],['green','সবুজ','#1d4a35']],
  paint:c=>({body:c,cap:c,ink:c}),
  m:2.1,L:1.36,r:0.072,speed:13,grip:1.4}
];
const byId=id=>PENS.find(p=>p.id===id);
// A pen definition in one of its colours. An unknown colour falls back to the pen's first one.
function penDef(id,color){const b=byId(id),c=b.colors.find(k=>k[0]===color)||b.colors[0];return Object.assign({},b,b.paint(c[2]),{color:c[0],colorBn:c[1]});}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const $=s=>document.querySelector(s);
const toBn=n=>String(n).replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[d]);
// Canvas fonts. Keep in step with --font-ui and --font-chalk in css/style.css and the Google Fonts link.
const FONT_UI='"Anek Bangla", sans-serif', FONT_CHALK='"Atma", "Anek Bangla", cursive';
// Today's date as it would be chalked on the board, e.g. ২৪.১০.২০২৬ and শনিবার.
function todayBn(){const d=new Date(),z=n=>String(n).padStart(2,'0');return toBn(`${z(d.getDate())}.${z(d.getMonth()+1)}.${d.getFullYear()}`);}
const weekdayBn=()=>['রবিবার','সোমবার','মঙ্গলবার','বুধবার','বৃহস্পতিবার','শুক্রবার','শনিবার'][new Date().getDay()];

const G={mode:'cpu',diff:'medium',view:'3d',p1:'econo',p2:'pinpoint',c1:'blue',c2:'red',score:[0,0],turn:0,starter:0,state:'menu',restT:0,matchLive:false,cpuAnim:null,aimVis:null};
let pens=[],meshes=[],rings=[],muted=false,has3D=true;

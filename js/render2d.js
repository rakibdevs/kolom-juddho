// Top-down 2D renderer, the fallback when WebGL is missing.
"use strict";

const c2=$('#c2'),g2=c2.getContext('2d');
let T2={s:20,cx:0,cy:0,portrait:false};
let floorPat=null,woodPat=null,chairPat=null;
const smudges=Array.from({length:7},()=>({x:(Math.random()-.5)*12,z:(Math.random()-.5)*6,r:.4+Math.random()*1.1}));
function pat(canvas,scale){const p=g2.createPattern(canvas,'repeat');if(p&&p.setTransform&&window.DOMMatrix)p.setTransform(new DOMMatrix().scale(scale));return p;}
function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.arcTo(x+w,y,x+w,y+r,r);g.lineTo(x+w,y+h-r);g.arcTo(x+w,y+h,x+w-r,y+h,r);g.lineTo(x+r,y+h);g.arcTo(x,y+h,x,y+h-r,r);g.lineTo(x,y+r);g.arcTo(x,y,x+r,y,r);g.closePath();}
// W x H defaults to the screen. The share card passes its own size and `shot` to skip the HUD margins.
function layout2D(W=innerWidth,H=innerHeight,shot=false){
  const dpr=shot?1:Math.min(window.devicePixelRatio||1,2);
  if(c2.width!==Math.round(W*dpr)||c2.height!==Math.round(H*dpr)){c2.width=Math.round(W*dpr);c2.height=Math.round(H*dpr);}
  const topRes=shot?16:88,botRes=shot?16:70,H2=H-topRes-botRes,portrait=H2>W*1.05;
  const s=portrait?Math.min(W/11,H2/17):Math.min(W/17.5,H2/11);
  T2={s,cx:W/2,cy:topRes+H2/2,portrait,dpr};
}
function setWorld(g){
  const {s,cx,cy,portrait,dpr}=T2;
  if(portrait)g.setTransform(0,-s*dpr,s*dpr,0,cx*dpr,cy*dpr);
  else g.setTransform(s*dpr,0,0,s*dpr,cx*dpr,cy*dpr);
}
function screenToWorld(sx,sy){
  const {s,cx,cy,portrait}=T2;
  return portrait?{x:-(sy-cy)/s,z:(sx-cx)/s}:{x:(sx-cx)/s,z:(sy-cy)/s};
}
// Draws a pen lying along +x with the tip at -L/2 and the posted cap at +L/2, in world units.
// The home screen, the share card and the 2D view all use it.
function drawPen2D(g,p){
  const d=p.def;let sc=1,alpha=1,onTable=true;
  if(p.falling){const k=clamp((TOP+p.r-p.falling.y)/TOP,0,1);sc=1-.3*k;alpha=1-.35*k;onTable=false;}
  const L=d.L,R=d.r*2.3,tl=L*(d.nib?.13:.1),capLen=L*.34,x0=-L/2+tl,x1=L/2-capLen,nose=d.nose?L*.07:0,grip=d.rubber?L*.2:0;
  g.save();g.translate(p.x,p.z);g.rotate(p.a);g.scale(sc,sc);g.globalAlpha=alpha;
  if(onTable){g.fillStyle='rgba(0,0,0,.32)';rr(g,-L/2+.06,-R+.1,L,2*R,R);g.fill();}
  else{g.fillStyle='rgba(0,0,0,.2)';rr(g,-L/2+.03,-R+.05,L,2*R,R);g.fill();}
  // tip: a ballpoint cone, or a fountain nib with its slit
  g.fillStyle=d.tip;g.beginPath();
  if(d.nib){g.moveTo(-L/2,0);g.quadraticCurveTo(-L/2+tl*.45,-R*1.05,x0,-R*.8);g.lineTo(x0,R*.8);g.quadraticCurveTo(-L/2+tl*.45,R*1.05,-L/2,0);g.fill();
    g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=.012;g.beginPath();g.moveTo(-L/2,0);g.lineTo(-L/2+tl*.6,0);g.stroke();g.fillStyle='rgba(0,0,0,.6)';g.beginPath();g.arc(-L/2+tl*.62,0,.014,0,7);g.fill();}
  else{g.moveTo(-L/2,0);g.lineTo(x0,-R*.85);g.lineTo(x0,R*.85);g.closePath();g.fill();}
  // barrel
  g.fillStyle=d.body;g.globalAlpha=alpha*(d.clear?.75:1);g.fillRect(x0,-R,x1-x0+.02,2*R);g.globalAlpha=alpha;
  if(d.clear){g.fillStyle=d.ink;g.fillRect(x0+nose,-R*.3,x1-x0-nose,R*.6);}
  if(d.hex){g.strokeStyle='rgba(0,0,0,.2)';g.lineWidth=.012;[-.55,.55].forEach(k=>{g.beginPath();g.moveTo(x0,R*k);g.lineTo(x1,R*k);g.stroke();});}
  if(d.nose){g.fillStyle=d.nose;g.fillRect(x0,-R*1.02,nose,R*2.04);}
  if(d.rubber){g.fillStyle=d.rubber;g.fillRect(x0,-R*1.08,grip,R*2.16);g.strokeStyle='rgba(255,255,255,.1)';g.lineWidth=.01;for(let x=x0+grip/8;x<x0+grip;x+=grip/8){g.beginPath();g.moveTo(x,-R*1.08);g.lineTo(x,R*1.08);g.stroke();}}
  if(d.label){
    // text is drawn at 250x and scaled down, because tiny font sizes render badly
    const lx=(x0+nose+grip+x1)/2,k=.004;g.save();g.translate(lx,0);g.scale(k,k);
    g.font=`700 ${R*.9/k}px ${FONT_UI}`;g.textAlign='center';g.textBaseline='middle';
    g.fillStyle=d.labelInk||'#222';g.globalAlpha=alpha*.85;g.fillText(d.label,0,R*.08/k,(x1-x0-nose-grip)*.8/k);g.restore();
  }
  // posted cap with clip and trim band
  g.fillStyle=d.cap;rr(g,x1,-R*1.13,capLen,R*2.26,R*.9);g.fill();
  g.fillStyle=d.trim||d.clip||'rgba(255,255,255,.35)';rr(g,x1+capLen*.12,-R*.28,capLen*.74,R*.56,R*.2);g.fill();
  g.fillStyle='rgba(255,255,255,.3)';g.fillRect(x1+capLen*.14,-R*.22,capLen*.68,R*.12);
  if(d.trim){g.fillStyle=d.trim;g.fillRect(x1-.01,-R*1.16,.035,R*2.32);g.fillRect(L/2-.03,-R*.7,.03,R*1.4);}
  g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=R*.28;g.beginPath();g.moveTo(x0+.03,-R*.6);g.lineTo(L/2-.05,-R*.6);g.stroke();
  g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=.02;rr(g,x0,-R*1.13,L-tl,R*2.26,R*.6);g.stroke();
  g.restore();
}
function draw2D(now,W,H,shot){
  layout2D(W,H,shot);const g=g2,{s,dpr}=T2;
  if(!floorPat){floorPat=pat(ART.floor,.012);woodPat=pat(ART.tableWood,.03);chairPat=pat(ART.darkWood,.03);}
  // floor
  setWorld(g);g.fillStyle=floorPat||'#8f8c84';g.fillRect(-40,-40,80,80);
  // dais
  g.fillStyle='#b4ad9e';g.fillRect(-23,-12,46,17);
  g.fillStyle='rgba(0,0,0,.25)';g.fillRect(-23,5,46,.35);
  // blackboard strip on the front wall
  g.fillStyle='#6a4024';g.fillRect(-19.2,-12.6,38.4,1.1);g.fillStyle='#1f2b25';g.fillRect(-18,-12.4,36,.6);
  g.fillStyle='#f4f2ea';[-12,-11.3,-10.7].forEach(x=>g.fillRect(x-.5,-11.3,1,.22));
  // chair, cane, register
  g.fillStyle='rgba(0,0,0,.28)';g.fillRect(-1.9,-9.4,4.2,4.1);
  g.fillStyle=chairPat||'#6a4024';g.fillRect(-2.1,-9.6,4.2,4);g.fillRect(-2.1,-9.9,4.2,.4);
  g.fillStyle='#7a1f22';g.save();g.translate(-.6,-7.9);g.fillRect(-1.3,-1.7,2.6,3.4);g.restore();
  g.strokeStyle='#9a6a33';g.lineWidth=.18;g.lineCap='round';g.beginPath();g.moveTo(.5-5.2,-7.3+1.9);g.lineTo(.5+5.2,-7.3-1.9);g.stroke();
  // table shadow + top
  g.fillStyle='rgba(0,0,0,.35)';rr(g,-HX-.25+.35,-HZ-.25+.45,HX*2+.5,HZ*2+.5,.2);g.fill();
  g.fillStyle=woodPat||'#7a4826';rr(g,-HX-.25,-HZ-.25,HX*2+.5,HZ*2+.5,.2);g.fill();
  g.strokeStyle='#3d2210';g.lineWidth=.12;g.stroke();
  g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=.05;rr(g,-HX-.1,-HZ-.1,HX*2+.2,HZ*2+.2,.15);g.stroke();
  smudges.forEach(m=>{const gr=g.createRadialGradient(m.x,m.z,0,m.x,m.z,m.r);gr.addColorStop(0,'rgba(255,255,255,.07)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(m.x-m.r,m.z-m.r,2*m.r,2*m.r);});
  // fallen pens first (below table level), then table pens
  pens.forEach(p=>{if(p.falling)drawPen2D(g,p);});
  // active ring
  if(G.matchLive&&(G.state==='aim'||G.state==='cpu')){const p=pens[G.turn];if(p&&!p.out){g.strokeStyle=G.turn?'rgba(255,77,67,':'rgba(63,107,255,';g.strokeStyle+=(.45+.3*Math.sin(now/220))+')';g.lineWidth=.09;g.beginPath();g.arc(p.x,p.z,p.L*.62,0,7);g.stroke();}}
  pens.forEach(p=>{if(!p.falling)drawPen2D(g,p);});
  // aim
  const a=G.aimVis;
  if(a){
    if(a.px!=null){g.setLineDash([.18,.16]);g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=.05;g.beginPath();g.moveTo(a.cx,a.cz);g.lineTo(a.px,a.pz);g.stroke();g.setLineDash([]);}
    const len=.5+a.power*3.2,ex=a.cx+Math.cos(a.ang)*len,ez=a.cz+Math.sin(a.ang)*len;
    const col=`hsl(${Math.round((1-a.power)*120)},90%,52%)`;
    g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=.22;g.lineCap='round';g.beginPath();g.moveTo(a.cx,a.cz);g.lineTo(ex,ez);g.stroke();
    g.strokeStyle=col;g.lineWidth=.14;g.beginPath();g.moveTo(a.cx,a.cz);g.lineTo(ex,ez);g.stroke();
    g.save();g.translate(ex,ez);g.rotate(a.ang);g.fillStyle=col;g.beginPath();g.moveTo(.55,0);g.lineTo(0,-.3);g.lineTo(0,.3);g.closePath();g.fill();g.restore();
    g.fillStyle='#fff';g.beginPath();g.arc(a.cx,a.cz,.09,0,7);g.fill();
  }
  g.setTransform(1,0,0,1,0,0);
}

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
// A part shaded like a cylinder seen from above: dark edges, a highlight band towards the light (top).
function cylGrad(g,c,R,gloss){
  const gr=g.createLinearGradient(0,-R,0,R),k=gloss?.65:.32;
  gr.addColorStop(0,mixHex(c,'#000000',.35));gr.addColorStop(.2,mixHex(c,'#ffffff',k));gr.addColorStop(.38,c);
  gr.addColorStop(.8,mixHex(c,'#000000',.18));gr.addColorStop(1,mixHex(c,'#000000',.5));return gr;
}
// A capped pen lying on the table, front (cap) at -L/2: the barrel with its print and end plug, then the cap
// with its domed top, lip ring and clip. Under a clear cap the grip, cone and tip show through.
function drawPen2D(g,p){
  const d=p.def;let sc=1,alpha=1,onTable=true;
  if(p.falling){const k=clamp((TOP+p.r-p.falling.y)/TOP,0,1);sc=1-.3*k;alpha=1-.35*k;onTable=false;}
  // pens are drawn 1.6x wider than real so they stay readable from above, yet keep a slim pen shape
  const L=d.L,R=d.r*PEN_W2D,xf=-L/2,xb=L/2,capLen=L*(d.capLen||.3),lip=xf+capLen,Rc=R*1.12;
  const endLen=L*(d.endLen||.035),b0=lip-R*.6,b1=xb-endLen,grip=d.rubber?L*.2:0;
  const fill=(c,a)=>{g.globalAlpha=alpha*(a==null?1:a);g.fill();g.globalAlpha=alpha;};
  g.save();g.translate(p.x,p.z);g.rotate(p.a);g.scale(sc,sc);g.globalAlpha=alpha;
  g.fillStyle=onTable?'rgba(0,0,0,.24)':'rgba(0,0,0,.15)';rr(g,xf+.04,-R*1.05+.06,L,2*R*1.1,R);g.fill();
  // barrel: opaque, frosted see-through (refill inside), or six-sided
  g.fillStyle=cylGrad(g,d.body,R,d.clear);g.beginPath();g.rect(b0,-R,b1-b0,2*R);fill(d.body,d.clear?.62:1);
  if(d.clear){g.fillStyle=d.ink;g.beginPath();g.rect(b0,-R*.2,b1-b0,R*.4);fill(d.ink,.55);}
  if(d.hex){g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=R*.08;[-.5,.5].forEach(k=>{g.beginPath();g.moveTo(b0,R*k);g.lineTo(b1,R*k);g.stroke();});}
  if(d.rubber){
    g.fillStyle=cylGrad(g,d.rubber,R*1.05);g.beginPath();g.rect(lip,-R*1.05,grip,R*2.1);g.fill();
    g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=R*.07;for(let x=lip+grip/9;x<lip+grip;x+=grip/9){g.beginPath();g.moveTo(x,-R);g.lineTo(x,R);g.stroke();}
  }
  if(d.label){
    // text is drawn at 250x and scaled down, because tiny font sizes render badly
    const lx=(lip+grip+b1)/2,k=.004;g.save();g.translate(lx,0);g.scale(k,k);
    g.font=`700 ${R*.82/k}px ${FONT_UI}`;g.textAlign='center';g.textBaseline='middle';
    g.fillStyle=d.labelInk||'#222';g.globalAlpha=alpha*.9;g.fillText(d.label,0,R*.06/k,(b1-lip-grip)*.82/k);g.restore();
  }
  // end plug, with a gold band on trimmed pens
  const ec=d.end||d.cap||d.body;g.fillStyle=cylGrad(g,ec,R*.96,d.capMetal&&ec===d.cap);rr(g,b1-R*.1,-R*.96,endLen+R*.1,R*1.92,R*.55);fill(ec,d.capClear&&ec===d.cap?.6:1);
  if(d.trim){g.fillStyle=cylGrad(g,d.trim,R,true);g.fillRect(b1-R*.1,-R,L*.018,2*R);}
  // under a clear cap: the grip section, the cone and the tip
  if(d.capClear){
    const nl=L*(d.noseLen||.13),nx=lip-nl,cone=L*.04;
    g.fillStyle=cylGrad(g,d.nose||d.rubber||d.body,R*.9);g.beginPath();g.moveTo(lip,-R*.9);g.lineTo(nx,-R*.62);g.lineTo(nx,R*.62);g.lineTo(lip,R*.9);g.closePath();fill(null,d.noseClear?.7:1);
    if(d.noseClear){g.fillStyle=d.ink;g.fillRect(nx,-R*.16,nl,R*.32);}
    g.fillStyle=cylGrad(g,d.tip||'#b8bcc2',R*.6,true);g.beginPath();g.moveTo(nx,-R*.62);g.lineTo(nx-cone,-R*.14);g.lineTo(nx-cone,R*.14);g.lineTo(nx,R*.62);g.closePath();g.fill();
    g.strokeStyle=d.tip||'#9aa0a8';g.lineWidth=R*.16;g.beginPath();g.moveTo(nx-cone,0);g.lineTo(nx-cone-L*.025,0);g.stroke();
  }
  // the cap: domed top, straight sides, square lip
  const capPath=()=>{g.beginPath();g.moveTo(lip,-Rc);g.lineTo(xf+Rc,-Rc);g.quadraticCurveTo(xf,-Rc,xf,0);g.quadraticCurveTo(xf,Rc,xf+Rc,Rc);g.lineTo(lip,Rc);g.closePath();};
  g.fillStyle=cylGrad(g,d.cap,Rc,d.capMetal||d.capClear);capPath();fill(d.cap,d.capClear?.38:1);
  if(d.capClear){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=R*.12;capPath();g.stroke();}
  const ring=d.trim||d.capRing;
  if(ring){g.fillStyle=cylGrad(g,ring,Rc*1.02,true);g.fillRect(lip-L*.022,-Rc*1.02,L*.022,Rc*2.04);}
  // clip: a strip along the cap from near its top, ending in a small bead
  const cc=d.trim||d.clip||d.cap,c0=xf+L*.035,c1=xf+L*(d.clipLen||.27),cw=R*.42;
  g.fillStyle='rgba(0,0,0,.22)';rr(g,c0,-cw/2+R*.12,c1-c0,cw,cw/2);g.fill();
  g.fillStyle=cylGrad(g,cc,cw/2,d.capMetal||!!d.trim);g.save();g.translate(0,0);rr(g,c0,-cw/2,c1-c0,cw,cw/2);fill(cc,d.capClear?.6:1);g.restore();
  g.fillStyle=cylGrad(g,cc,cw*.6,true);g.beginPath();g.arc(c1-cw*.4,0,cw*.6,0,7);fill(cc,d.capClear?.6:1);
  // outline, so light pens stand out on the table
  g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=R*.07;capPath();g.stroke();g.beginPath();g.rect(lip,-R,b1-lip,2*R);g.stroke();
  g.restore();
}
function draw2D(now,W,H,shot){
  layout2D(W,H,shot);const g=g2,{s,dpr}=T2;
  if(!floorPat){floorPat=pat(ART.floor,.012);woodPat=pat(ART.tableWood,.02);chairPat=pat(ART.darkWood,.03);}
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
    const len=.5+a.power*3.2*(a.sup?1.3:1),ex=a.cx+Math.cos(a.ang)*len,ez=a.cz+Math.sin(a.ang)*len;
    const col=a.sup?'#ffc61a':`hsl(${Math.round((1-a.power)*120)},90%,52%)`; // gold when ⚡ is armed
    g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=.22;g.lineCap='round';g.beginPath();g.moveTo(a.cx,a.cz);g.lineTo(ex,ez);g.stroke();
    g.strokeStyle=col;g.lineWidth=.14;g.beginPath();g.moveTo(a.cx,a.cz);g.lineTo(ex,ez);g.stroke();
    g.save();g.translate(ex,ez);g.rotate(a.ang);g.fillStyle=col;g.beginPath();g.moveTo(.55,0);g.lineTo(0,-.3);g.lineTo(0,.3);g.closePath();g.fill();g.restore();
    g.fillStyle='#fff';g.beginPath();g.arc(a.cx,a.cz,.09,0,7);g.fill();
  }
  g.setTransform(1,0,0,1,0,0);
}

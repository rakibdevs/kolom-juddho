// Canvas textures shared by both views.
"use strict";

function mkCanvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return c;}
function woodCanvas(base,dark){
  return mkCanvas(512,512,(g,w,h)=>{
    g.fillStyle=base;g.fillRect(0,0,w,h);
    for(let i=0;i<110;i++){
      g.strokeStyle=dark;g.globalAlpha=.06+Math.random()*.2;g.lineWidth=1+Math.random()*3.5;
      const y0=Math.random()*h,amp=2+Math.random()*7,f=.005+Math.random()*.02,ph=Math.random()*6;
      g.beginPath();for(let x=0;x<=w;x+=12){const y=y0+Math.sin(x*f+ph)*amp;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
    }
    g.globalAlpha=1;
  });
}
function floorCanvas(){
  return mkCanvas(512,512,(g,w,h)=>{
    // worn grey cement, the usual classroom floor: speckle, scuff patches, hairline cracks, joints
    g.fillStyle='#8f8c84';g.fillRect(0,0,w,h);
    for(let i=0;i<9000;i++){g.fillStyle=Math.random()<.5?'rgba(0,0,0,.07)':'rgba(255,255,255,.06)';g.fillRect(Math.random()*w,Math.random()*h,2,2);}
    for(let i=0;i<20;i++){const x=Math.random()*w,y=Math.random()*h,r=30+Math.random()*100,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,i%3?'rgba(0,0,0,.08)':'rgba(255,255,255,.07)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);}
    g.strokeStyle='rgba(40,38,34,.28)';g.lineWidth=1.2;
    for(let i=0;i<6;i++){let x=Math.random()*w,y=Math.random()*h;g.beginPath();g.moveTo(x,y);for(let k=0;k<7;k++){x+=(Math.random()-.5)*40;y+=10+Math.random()*25;g.lineTo(x,y);}g.stroke();}
    g.strokeStyle='rgba(30,28,25,.3)';g.lineWidth=2;for(let i=0;i<=w;i+=256){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(w,i);g.stroke();}
  });
}
const ART={};
function buildArt(){
  ART.tableWood=woodCanvas('#7a4826','#3d2210');
  ART.darkWood=woodCanvas('#6a4024','#38200e');
  ART.benchWood=woodCanvas('#8c5a32','#4a2b14');
  ART.legWood=woodCanvas('#5a3518','#2c180a');
  ART.floor=floorCanvas();
}

// Sir's table seen from above, W x H in CSS pixels: planks, register, cane, duster, chalk and two pens.
// Used behind the home screen and on the share card.
function drawTableTop(g,W,H){
  const u=Math.max(Math.min(W,H)/9,48);
  const at=(x,y,a,fn)=>{g.save();g.translate(x,y);g.rotate(a);fn();g.restore();};
  const shadow=on=>{g.shadowColor=on?'rgba(0,0,0,.45)':'transparent';g.shadowBlur=on?u*.25:0;g.shadowOffsetY=on?u*.08:0;};
  const blot=(x,y,r,c)=>{const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,c);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);};
  // wood planks
  const p=g.createPattern(ART.tableWood,'repeat');if(p&&p.setTransform&&window.DOMMatrix)p.setTransform(new DOMMatrix().scale(u/90));
  g.fillStyle=p||'#7a4826';g.fillRect(0,0,W,H);
  const plank=u*2.6;
  for(let y=0,i=0;y<H;y+=plank,i++){
    if(i%2){g.fillStyle='rgba(0,0,0,.05)';g.fillRect(0,y,W,plank);}
    g.fillStyle='rgba(30,15,5,.55)';g.fillRect(0,y,W,2);g.fillStyle='rgba(255,255,255,.08)';g.fillRect(0,y+2,W,1);
  }
  // old ink blot and a tea cup ring
  blot(u*3.7,u*.9,u*.6,'rgba(30,60,160,.38)');blot(u*4.2,u*1.25,u*.16,'rgba(30,60,160,.4)');
  g.strokeStyle='rgba(50,25,8,.35)';g.lineWidth=u*.07;g.beginPath();g.arc(W-u*2.2,u*3.6,u*.6,.4,5.6);g.stroke();
  // attendance register
  shadow(true);
  at(u*1.6,u*2,-.12,()=>{
    g.fillStyle='#7a1f22';rr(g,-1.3*u,-1.7*u,2.6*u,3.4*u,u*.08);g.fill();shadow(false);
    g.fillStyle='#5a1518';g.fillRect(-1.3*u,-1.7*u,.35*u,3.4*u);
    g.fillStyle='#efe6cf';g.fillRect(-.75*u,-1.1*u,1.75*u,.95*u);
    g.fillStyle='#3a2a1a';g.textAlign='center';g.textBaseline='middle';
    g.font=`700 ${u*.3}px ${FONT_CHALK}`;g.fillText('হাজিরা খাতা',.125*u,-.8*u);
    g.font=`600 ${u*.19}px ${FONT_CHALK}`;g.fillText('৭ম শ্রেণি · ক শাখা',.125*u,-.42*u);
  });
  // the cane
  shadow(true);
  at(W*.5,u*.7,.2,()=>{
    const len=W;g.lineCap='round';g.strokeStyle='#9a6a33';g.lineWidth=u*.16;g.beginPath();g.moveTo(0,0);g.lineTo(len,0);g.stroke();shadow(false);
    g.strokeStyle='rgba(255,240,200,.3)';g.lineWidth=u*.04;g.beginPath();g.moveTo(u*.2,-u*.03);g.lineTo(len,-u*.03);g.stroke();
    g.strokeStyle='#6b4520';g.lineWidth=u*.05;for(let x=u*1.4;x<len;x+=u*2.2){g.beginPath();g.moveTo(x,-u*.09);g.lineTo(x,u*.09);g.stroke();}
  });
  // duster, chalk dust and chalk
  blot(W-u*3.3,H-u*1.5,u*1.3,'rgba(255,255,255,.22)');blot(W-u*2.6,H-u*3,u*.7,'rgba(255,255,255,.14)');
  shadow(true);
  at(W-u*2,H-u*2.2,.25,()=>{
    g.fillStyle='#8c5a32';rr(g,-1.2*u,-.5*u,2.4*u,u,u*.12);g.fill();shadow(false);
    g.fillStyle='#5b5f63';g.fillRect(-1.2*u,.3*u,2.4*u,.2*u);
    g.fillStyle='rgba(255,255,255,.18)';g.fillRect(-1.1*u,-.4*u,2.2*u,.08*u);
  });
  [[W-u*3.7,H-u*2.7,-.4,.9,'#f4f2ea'],[W-u*3.1,H-u*3.3,.3,.75,'#f3e58c'],[W-u*4.2,H-u*1.9,1.1,.35,'#f4f2ea']].forEach(([x,y,a,l,c])=>{
    shadow(true);at(x,y,a,()=>{g.fillStyle=c;rr(g,-l*u/2,-.09*u,l*u,.18*u,.08*u);g.fill();});
  });
  shadow(false);
  // two pens left behind after tiffin
  const k=u*1.5;
  [['econo','blue',u*2.2,H-u*1.9,-.5],['pinpoint','red',u*3.1,H-u*1.2,.35]].forEach(([id,col,x,y,a])=>{
    g.save();g.translate(x,y);g.scale(k,k);drawPen2D(g,{def:penDef(id,col),x:0,z:0,a});g.restore();
  });
}

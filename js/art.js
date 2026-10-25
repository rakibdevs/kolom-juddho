// Canvas textures shared by both views.
"use strict";

function mkCanvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return c;}
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
// Old classroom wood: uneven varnish with grime in the grain, worn pale patches, knots, fine scratches, dents
// and plank joints. `extra` paints the top's own marks (ink, tea rings, carvings) on afterwards; `grime` scales
// how dark the old varnish and dirt get, `scr` how many and how deep the scratches are.
function oldWoodCanvas(w,h,base,dark,planks,extra,grime=1,scr=1){
  return mkCanvas(w,h,(g)=>{
    const R=Math.random,blot=(x,y,r,c)=>{const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,c);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);};
    g.fillStyle=base;g.fillRect(0,0,w,h);
    for(let i=0;i<14;i++)blot(R()*w,R()*h,40+R()*140,`rgba(20,10,4,${(.08+R()*.14)*grime})`);   // grime and old varnish
    for(let i=0;i<6;i++)blot(R()*w,R()*h,50+R()*120,`rgba(255,230,190,${.05+R()*.07})`); // rubbed pale by elbows
    for(let i=0;i<160;i++){ // grain
      g.strokeStyle=dark;g.globalAlpha=(.05+R()*.22)*(.6+.4*grime);g.lineWidth=.8+R()*3;
      const y0=R()*h,amp=1.5+R()*6,f=.004+R()*.018,ph=R()*6;
      g.beginPath();for(let x=0;x<=w;x+=10){const y=y0+Math.sin(x*f+ph)*amp;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
    }
    g.globalAlpha=1;
    for(let i=0;i<5;i++){const x=R()*w,y=R()*h,rx=8+R()*16,ry=4+R()*6; // knots
      for(let k=4;k>0;k--){g.strokeStyle=`rgba(30,15,5,${.15+k*.08})`;g.lineWidth=1.5;g.beginPath();g.ellipse(x,y,rx*k/4,ry*k/4,0,0,7);g.stroke();}}
    for(let i=0;i<260*scr;i++){const x=R()*w,y=R()*h,l=4+R()*(30+20*scr),a=(R()-.5)*.9+(R()<.5?0:Math.PI/2*R()); // scratches:
      const dx=Math.cos(a)*l,dy=Math.sin(a)*l,k=Math.min(1,.5+.3*scr);                                  // a dark groove
      g.lineWidth=.7+R()*(.8+.6*scr);g.strokeStyle=`rgba(25,12,4,${(.12+R()*.25)*k})`;                   // with a pale lip
      g.beginPath();g.moveTo(x,y);g.lineTo(x+dx,y+dy);g.stroke();
      g.strokeStyle=`rgba(255,236,205,${(.1+R()*.25)*k})`;g.beginPath();g.moveTo(x+1,y+1);g.lineTo(x+dx+1,y+dy+1);g.stroke();}
    for(let i=0;i<70;i++){g.fillStyle=`rgba(15,8,3,${.2+R()*.35})`;g.beginPath();g.arc(R()*w,R()*h,.8+R()*2.4,0,7);g.fill();} // dents
    for(let p=1;p<planks;p++){const y=p*h/planks+(R()-.5)*6; // joints between planks
      g.fillStyle='rgba(12,6,2,.75)';g.fillRect(0,y-1.5,w,3);g.fillStyle='rgba(255,230,190,.12)';g.fillRect(0,y+1.5,w,1.5);}
    if(extra)extra(g,w,h,blot);
  });
}
// Carvings boys scratched into desks with compasses: dark grooves with a pale edge.
function carve(g,txt,x,y,size,rot){
  g.save();g.translate(x,y);g.rotate(rot);g.font=`600 ${size}px ${FONT_UI}`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
  g.lineWidth=size*.09;g.strokeStyle='rgba(255,228,180,.35)';g.strokeText(txt,1.5,1.5);g.strokeStyle='rgba(15,7,2,.8)';g.strokeText(txt,0,0);g.restore();
}
function inkBlot(g,blot,x,y,r){blot(x,y,r,'rgba(25,45,130,.55)');for(let i=0;i<5;i++)blot(x+(Math.random()-.5)*r*1.6,y+(Math.random()-.5)*r*1.6,r*.25,'rgba(25,45,130,.5)');}
function buildArt(){
  // Sir's table: dark old varnish, rubbed pale in the middle, tea rings, ink blots and chalk dust
  // mid teak, worn paler where hands rest, with a few deep scratches; light enough for dark pens to stand out
  ART.tableWood=oldWoodCanvas(1024,600,'#7a4d2b','#3a200c',3,(g,w,h,blot)=>{ // covers the whole top once, so nothing repeats
    blot(w*.5,h*.5,w*.5,'rgba(255,232,190,.1)');
    inkBlot(g,blot,w*.78,h*.22,22);inkBlot(g,blot,w*.18,h*.7,12);
    g.strokeStyle='rgba(40,20,6,.45)';g.lineWidth=5;g.beginPath();g.arc(w*.3,h*.28,34,.3,5.7);g.stroke();g.beginPath();g.arc(w*.33,h*.3,32,1,5.2);g.stroke();
    blot(w*.85,h*.8,60,'rgba(255,255,255,.1)');
  },.75,.7); // fewer scratches here than on the desks, so the pens stay easy to see
  ART.darkWood=oldWoodCanvas(512,512,'#5e3a20','#2a170a',1);
  ART.legWood=oldWoodCanvas(256,256,'#4e2f17','#22130a',1);
  ART.benchWood=oldWoodCanvas(512,256,'#7a5636','#3a2412',2);
  // three desk tops, each with its own carvings, so neighbouring desks differ
  const marks=[['R + M','৯ম খ','IIII IIII'],['রাশেদ','#','মিতু ♥'],['গণিত বাজে','T + S','IIII']];
  ART.deskTops=marks.map((m,v)=>oldWoodCanvas(1024,192,['#7d5634','#74502f','#81593a'][v],'#33200f',2,(g,w,h,blot)=>{
    carve(g,m[0],w*(.18+v*.05),h*.36,46,-.08);carve(g,m[1],w*.55,h*.66,40,.12);carve(g,m[2],w*.84,h*.4,34,-.03);
    if(v!==1){g.save();g.translate(w*(.38+v*.2),h*.42);g.strokeStyle='rgba(15,7,2,.75)';g.lineWidth=3; // noughts and crosses
      [[-18,-6],[-18,6],[-6,-18],[6,-18]].forEach(([a,b],i)=>{g.beginPath();i<2?(g.moveTo(-24,b*1.5),g.lineTo(24,b*1.5)):(g.moveTo(a*1.5,-24),g.lineTo(a*1.5,24));g.stroke();});g.restore();}
    inkBlot(g,blot,w*(.7-v*.2),h*.25,14+v*4);
  }));
  ART.floor=floorCanvas();
}

// Sir's table seen from above, W x H in CSS pixels: planks, register, cane, duster, chalk and two pens.
// Used behind the home screen and on the share card.
// The classroom wall behind the home screen: whitewashed plaster with damp patches above, oil-paint green below
// with scuffs, a strip of cement floor, a grilled window with sunlight, the class routine pinned up, and a wall
// clock in Bangla numerals showing the real time (redrawn every minute). Random details use a fixed seed, so
// the wall looks the same on every redraw.
function drawClassWall(g,W,H){
  const u=Math.max(Math.min(W,H)/9,48);
  let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const blot=(x,y,r,c)=>{const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,c);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);};
  const dado=H*.66,floor=H*.92,side=Math.max(0,(W-1180)/2); // the home content is at most 1180px wide: decorate the margins
  // whitewash and damp patches
  const wall=g.createLinearGradient(0,0,0,dado);wall.addColorStop(0,'#e4dcc4');wall.addColorStop(1,'#efe8d4');g.fillStyle=wall;g.fillRect(0,0,W,dado);
  for(let i=0;i<26;i++)blot(rnd()*W,rnd()*dado,u*(.4+rnd()*1.6),`rgba(${150+rnd()*40|0},${130+rnd()*30|0},${80+rnd()*30|0},${.05+rnd()*.07})`);
  g.strokeStyle='rgba(90,70,40,.12)';g.lineWidth=1;
  for(let i=0;i<14;i++){const x=rnd()*W;g.beginPath();g.moveTo(x,dado-u*.1);g.lineTo(x+(rnd()-.5)*u*.3,dado-u*(.6+rnd()*1.8));g.stroke();} // drip streaks
  for(let i=0;i<5;i++){let x=rnd()*W,y=rnd()*dado*.8;g.beginPath();g.moveTo(x,y);for(let k=0;k<5;k++){x+=(rnd()-.3)*u*.5;y+=rnd()*u*.4;g.lineTo(x,y);}g.stroke();} // hairline cracks
  // green oil paint below, with a dark border line and scuffs
  const paint=g.createLinearGradient(0,dado,0,floor);paint.addColorStop(0,'#4f8064');paint.addColorStop(1,'#3d6a52');g.fillStyle=paint;g.fillRect(0,dado,W,floor-dado);
  g.fillStyle='#2b5040';g.fillRect(0,dado-u*.06,W,u*.12);g.fillStyle='rgba(255,255,255,.12)';g.fillRect(0,dado+u*.06,W,u*.04);
  for(let i=0;i<40;i++){g.fillStyle=`rgba(255,255,255,${.04+rnd()*.06})`;g.fillRect(rnd()*W,dado+u*.3+rnd()*(floor-dado-u*.5),u*(.2+rnd()*.9),1+rnd()*2);}
  g.fillStyle='rgba(0,0,0,.18)';for(let x=u*.8;x<W;x+=u*(2.5+rnd()*2))g.fillRect(x,floor-u*.5,u*1.4,u*.5); // bench rub marks
  // cement floor
  g.fillStyle='#8f8a80';g.fillRect(0,floor,W,H-floor);
  g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=2;for(let x=-u;x<W+u;x+=u*1.6){g.beginPath();g.moveTo(x,floor);g.lineTo(x-u*.6,H);g.stroke();}
  g.fillStyle='rgba(0,0,0,.28)';g.fillRect(0,floor,W,u*.12);
  if(W<900)return; // on phones the content covers the wall: no props peeking out from behind it
  // grilled window with the field outside, and sunlight falling across the wall
  const ww=u*2.8,wx=Math.max(u*.5,side/2-ww/2),wy=u*1.1,wh=dado-u*1.6;
  g.fillStyle='#6b4a2c';g.fillRect(wx-u*.18,wy-u*.18,ww+u*.36,wh+u*.36);
  const sky=g.createLinearGradient(0,wy,0,wy+wh);sky.addColorStop(0,'#bfe0f2');sky.addColorStop(.62,'#e6f3df');sky.addColorStop(.63,'#7fb05a');sky.addColorStop(1,'#5f9442');g.fillStyle=sky;g.fillRect(wx,wy,ww,wh);
  g.fillStyle='#3a3f3a';for(let x=wx+ww/6;x<wx+ww;x+=ww/6)g.fillRect(x-u*.03,wy,u*.06,wh);g.fillRect(wx,wy+wh*.5-u*.03,ww,u*.06);
  g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.10;g.fillStyle='#fff2c8';
  g.beginPath();g.moveTo(wx+ww,wy);g.lineTo(wx+ww+u*5,wy+u*3);g.lineTo(wx+ww+u*5,wy+wh+u*3.5);g.lineTo(wx+ww,wy+wh);g.closePath();g.fill();g.restore();
  // class routine, pinned up
  const rx=W-Math.max(side/2,u*1.5),ry=Math.min(dado-u*1.35,u*4.6);
  g.save();g.translate(rx,ry);g.rotate(.03);g.scale(.85,.85);g.shadowColor='rgba(0,0,0,.25)';g.shadowBlur=u*.15;g.shadowOffsetY=u*.05;
  g.fillStyle='#fbf6e6';g.fillRect(-u*1.4,-u*1.1,u*2.8,u*2.6);g.shadowColor='transparent';
  g.fillStyle='#2a3140';g.textAlign='center';g.textBaseline='middle';g.font=`700 ${u*.22}px ${FONT_DISPLAY}`;g.fillText('ক্লাস রুটিন',0,-u*.82);
  g.font=`500 ${u*.15}px ${FONT_UI}`;
  ['বাংলা','ইংরেজি','গণিত','টিফিন','বিজ্ঞান','ধর্ম'].forEach((t,i)=>{const y=-u*.5+i*u*.3;g.strokeStyle='rgba(42,49,64,.25)';g.beginPath();g.moveTo(-u*1.2,y-u*.15);g.lineTo(u*1.2,y-u*.15);g.stroke();
    g.fillStyle=t==='টিফিন'?'#c8302b':'#2a3140';g.fillText(`${toBn(i+1)}. ${t}`,0,y);});
  g.fillStyle='#c8302b';[[-1.25,-.95],[1.25,-.95]].forEach(([x,y])=>{g.beginPath();g.arc(x*u,y*u,u*.06,0,7);g.fill();});
  g.restore();
  // wall clock with the real time
  const cr=u*.9,cx=W-Math.max(side/2,cr+u*.35),cy=u*2.1,now=new Date();
  g.save();g.shadowColor='rgba(0,0,0,.3)';g.shadowBlur=u*.2;g.shadowOffsetY=u*.06;g.fillStyle='#2b2b2b';g.beginPath();g.arc(cx,cy,cr,0,7);g.fill();g.restore();
  g.fillStyle='#fbf8ee';g.beginPath();g.arc(cx,cy,cr*.88,0,7);g.fill();
  g.fillStyle='#222';g.textAlign='center';g.textBaseline='middle';g.font=`700 ${cr*.2}px ${FONT_UI}`;
  for(let h=1;h<=12;h++){const a=h/12*Math.PI*2-Math.PI/2;g.fillText(toBn(h),cx+Math.cos(a)*cr*.68,cy+Math.sin(a)*cr*.68);}
  const hand=(a,len,w,c)=>{g.strokeStyle=c;g.lineWidth=w;g.lineCap='round';g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*len,cy+Math.sin(a)*len);g.stroke();};
  const m=now.getMinutes(),hr=now.getHours()%12+m/60;
  hand(hr/12*Math.PI*2-Math.PI/2,cr*.42,cr*.09,'#222');hand(m/60*Math.PI*2-Math.PI/2,cr*.62,cr*.06,'#222');
  g.fillStyle='#c8302b';g.beginPath();g.arc(cx,cy,cr*.06,0,7);g.fill();
}
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
    g.font=`700 ${u*.3}px ${FONT_DISPLAY}`;g.fillText('হাজিরা খাতা',.125*u,-.8*u);
    g.font=`600 ${u*.19}px ${FONT_DISPLAY}`;g.fillText('৭ম শ্রেণি · ক শাখা',.125*u,-.42*u);
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

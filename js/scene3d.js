// three.js r128 classroom, pen meshes and aim rings.
"use strict";

let renderer,scene,camera,raycaster,plane,arrow,pullLine,fans=[];
// Orbit camera around the table. `user` turns true once the player moves it, so resizes stop refitting it.
const cam={yaw:0.12,pitch:0.82,dist:15,tx:0,ty:TOP,tz:0,user:false};
// Inside of the classroom, kept a little away from the walls, board, fans and ceiling.
const ROOM={x:28.8,zMin:-10.6,zMax:52.4,yMax:27};
// Writes the orbit camera position into `out`, pulling it in so it never leaves the room.
// Outside the room the walls are all you would see.
function camPos(yaw,pitch,dist,out){
  const cp=Math.cos(pitch),dx=Math.sin(yaw)*cp,dy=Math.sin(pitch),dz=Math.cos(yaw)*cp;let t=dist;
  if(dx>1e-4)t=Math.min(t,(ROOM.x-cam.tx)/dx);else if(dx<-1e-4)t=Math.min(t,(-ROOM.x-cam.tx)/dx);
  if(dz>1e-4)t=Math.min(t,(ROOM.zMax-cam.tz)/dz);else if(dz<-1e-4)t=Math.min(t,(ROOM.zMin-cam.tz)/dz);
  if(dy>1e-4)t=Math.min(t,(ROOM.yMax-cam.ty)/dy);
  return out.set(cam.tx+dx*t,cam.ty+dy*t,cam.tz+dz*t);
}
// Smallest distance at which camera c, orbiting at yaw/pitch, sees the whole table top inside
// the screen box {x, top, bottom} given in normalised device coordinates.
function fitDist(c,yaw,pitch,box){
  const v=new THREE.Vector3(),cp=Math.cos(pitch);
  const fits=d=>{
    c.position.set(Math.sin(yaw)*cp*d,TOP+Math.sin(pitch)*d,Math.cos(yaw)*cp*d);c.lookAt(0,TOP,0);c.updateMatrixWorld();
    return [-1,1].every(sx=>[-1,1].every(sz=>{v.set(sx*(HX+.3),TOP,sz*(HZ+.3)).project(c);return Math.abs(v.x)<box.x&&v.y<box.top&&v.y>box.bottom;}));
  };
  let lo=5,hi=45;for(let i=0;i<18;i++){const m=(lo+hi)/2;if(fits(m))hi=m;else lo=m;}
  fits(hi);return hi; // leaves c at the fitted position
}
// Starting view that fits the table between the HUD and the hint. Portrait screens look along
// the table's long side from your end (an online friend in seat 1 has the far end), so your pen is nearest.
// On narrow phones that distance can be above the ceiling (camPos would pull the camera in and crop the
// table), so the camera comes lower until it fits.
function camHome(){
  const W=innerWidth,H=innerHeight,portrait=H>W*1.1,yaw=portrait?(G.mode==='online'&&G.seat===1?1:-1)*Math.PI/2:.12;
  const c=camera.clone();c.aspect=W/H;c.updateProjectionMatrix();
  const box={x:1-2*(portrait?20:14)/W,top:1-2*(portrait?116:H<500?60:96)/H,bottom:-1+2*(H<500?52:78)/H};
  let pitch=portrait?1.0:.82,dist=fitDist(c,yaw,pitch,box);
  while(dist*Math.sin(pitch)>ROOM.yMax-TOP-.1&&pitch>.5){pitch-=.03;dist=fitDist(c,yaw,pitch,box);}
  return {yaw,pitch,dist};
}
function resetCam(){if(camera)Object.assign(cam,camHome(),{user:false});}
function tex(canvas,rep){const t=new THREE.CanvasTexture(canvas);t.anisotropy=8;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}return t;}
function chalkText(g,txt,x,y,size,color,align){
  g.font=`600 ${size}px ${FONT_DISPLAY}`;g.textAlign=align||'left';g.textBaseline='middle';g.fillStyle=color||'#f2f1ea';
  for(let k=0;k<4;k++){g.globalAlpha=.22;g.fillText(txt,x+(Math.random()-.5)*3,y+(Math.random()-.5)*3);}
  g.globalAlpha=.85;g.fillText(txt,x,y);g.globalAlpha=1;
}
// The board names Rashed among the talkers, so it is redrawn when he is renamed.
let boardTex=null,boardName='';
function refreshBoard(){if(!boardTex||boardName===rival())return;boardName=rival();boardTex.image=boardCanvas();boardTex.needsUpdate=true;}
function boardCanvas(){
  return mkCanvas(2048,626,(g,w,h)=>{
    g.fillStyle='#1f2b25';g.fillRect(0,0,w,h);
    for(let i=0;i<160;i++){const x=Math.random()*w,y=Math.random()*h,r=40+Math.random()*200;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(255,255,255,${.02+Math.random()*.035})`);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}
    g.strokeStyle='rgba(255,255,255,.045)';g.lineWidth=70;for(let i=0;i<6;i++){g.beginPath();g.arc(300+Math.random()*1500,200+Math.random()*300,120+Math.random()*120,Math.random()*3,Math.random()*3+2);g.stroke();}
    chalkText(g,'তারিখ: '+todayBn(),64,78,46);
    chalkText(g,'বার: '+weekdayBn(),64,140,40);
    chalkText(g,'শ্রেণি: সপ্তম (ক)',w-64,78,46,null,'right');
    chalkText(g,'উপস্থিত: ৪২ জন',w-64,140,40,null,'right');
    chalkText(g,'আজকের পড়া: কলম যুদ্ধ',w/2,250,98,null,'center');
    g.strokeStyle='rgba(242,241,234,.7)';g.lineWidth=5;g.beginPath();g.moveTo(560,318);g.quadraticCurveTo(1024,300,1490,322);g.stroke();
    chalkText(g,'নিয়ম: বন্ধুর কলম টেবিল থেকে ফেলে দাও',w/2,388,52,null,'center');
    chalkText(g,'স্যার আসার আগেই খেলা শেষ!',w/2,470,56,'#f3e58c','center');
    chalkText(g,'১২ × ১২ = ১৪৪',70,500,44);
    chalkText(g,'a² + b² = c²',70,566,44);
    chalkText(g,`যারা কথা বলেছে: ${rival()}, তুহিন, মিতু`,w-64,566,40,'#f6b2a8','right');
  });
}
function signCanvas(){return mkCanvas(768,160,(g,w,h)=>{g.fillStyle='#f3ead0';g.fillRect(0,0,w,h);g.strokeStyle='#1f5a3a';g.lineWidth=10;g.strokeRect(8,8,w-16,h-16);g.fillStyle='#1f5a3a';g.font=`700 80px ${FONT_UI}`;g.textAlign='center';g.textBaseline='middle';g.fillText('জ্ঞানই শক্তি',w/2,h/2+6);});}
function clockCanvas(){
  return mkCanvas(256,256,g=>{
    g.fillStyle='#fbfaf4';g.beginPath();g.arc(128,128,124,0,7);g.fill();g.lineWidth=10;g.strokeStyle='#5b3a1e';g.stroke();
    g.fillStyle='#222';for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.beginPath();g.arc(128+Math.sin(a)*100,128-Math.cos(a)*100,i%3?4:7,0,7);g.fill();}
    const hand=(a,l,wd)=>{g.lineWidth=wd;g.lineCap='round';g.beginPath();g.moveTo(128,128);g.lineTo(128+Math.sin(a)*l,128-Math.cos(a)*l);g.stroke();};
    g.strokeStyle='#222';hand((11.5/12)*Math.PI*2,58,9);hand(Math.PI,88,6);
  });
}
function noticeCanvas(){
  return mkCanvas(512,360,(g,w,h)=>{
    g.fillStyle='#b98a56';g.fillRect(0,0,w,h);
    for(let i=0;i<2500;i++){g.fillStyle='rgba(60,30,10,.15)';g.fillRect(Math.random()*w,Math.random()*h,2,2);}
    const paper=(x,y,pw,ph,rot,c,lines)=>{g.save();g.translate(x,y);g.rotate(rot);g.fillStyle=c;g.fillRect(0,0,pw,ph);g.fillStyle='#2a2a2a';g.font=`600 27px ${FONT_DISPLAY}`;lines.forEach((l,i)=>g.fillText(l,14,36+i*32));g.fillStyle='#c0392b';g.beginPath();g.arc(pw/2,8,7,0,7);g.fill();g.restore();};
    paper(24,30,240,180,-.04,'#fffdf5',['ক্লাস রুটিন','১ম: বাংলা','২য়: গণিত','টিফিন: ১১:৩০']);
    paper(282,46,200,130,.05,'#fff3b8',['বার্ষিক','ক্রীড়া','প্রতিযোগিতা']);
    paper(290,200,190,130,-.03,'#d9f0ff',['নীরবতা','পালন করুন']);
  });
}
// Village scene painted on the side wall, like the murals in many Bangladeshi primary schools:
// river with a boat, hut, banana trees, a bullock cart and a woman in a red sari carrying a kolshi.
function muralCanvas(){
  return mkCanvas(2048,900,(g,w,h)=>{
    let gr=g.createLinearGradient(0,0,0,h*.55);gr.addColorStop(0,'#bfe0ee');gr.addColorStop(1,'#eef2e2');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='#f6b443';g.beginPath();g.arc(w*.82,h*.16,62,0,7);g.fill();
    g.fillStyle='rgba(255,255,255,.9)';[[.2,.12],[.5,.08],[.64,.2]].forEach(([x,y])=>{for(let k=0;k<4;k++){g.beginPath();g.ellipse(w*x+k*46,h*y+(k%2)*10,60,28,0,0,7);g.fill();}});
    // tree line and river
    g.fillStyle='#5f9a4a';for(let x=-40;x<w+40;x+=70){g.beginPath();g.ellipse(x,h*.47,60+(x*7%30),40+(x*3%25),0,0,7);g.fill();}
    g.fillStyle='#4f8a3e';g.fillRect(0,h*.47,w,h*.06);
    g.fillStyle='#6aa9c8';g.fillRect(0,h*.52,w,h*.16);
    g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=4;for(let i=0;i<26;i++){const x=(i*157)%w,y=h*(.55+(i%4)*.03);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+25,y-8,x+50,y);g.stroke();}
    const bx=w*.6,by=h*.6;
    g.fillStyle='#8a6a3a';g.beginPath();g.ellipse(bx,by-25,70,45,0,Math.PI,2*Math.PI);g.fill();
    g.fillStyle='#5a3a22';g.beginPath();g.moveTo(bx-170,by-30);g.lineTo(bx+170,by-30);g.quadraticCurveTo(bx+70,by+32,bx,by+32);g.quadraticCurveTo(bx-70,by+32,bx-170,by-30);g.fill();
    g.strokeStyle='#3a2414';g.lineWidth=6;g.beginPath();g.moveTo(bx+120,by-120);g.lineTo(bx+175,by+40);g.stroke();
    // paddy fields
    gr=g.createLinearGradient(0,h*.68,0,h);gr.addColorStop(0,'#9cc95a');gr.addColorStop(1,'#6fa43e');g.fillStyle=gr;g.fillRect(0,h*.68,w,h*.32);
    g.strokeStyle='rgba(60,100,30,.4)';g.lineWidth=3;for(let i=0;i<60;i++){const x=(i*211)%w,y=h*.74+(i*37)%(h*.24);g.beginPath();g.moveTo(x,y);g.lineTo(x+6,y-22);g.moveTo(x+12,y);g.lineTo(x+14,y-20);g.stroke();}
    // mud hut with a thatched roof
    const hx=w*.12,hy=h*.72;
    g.fillStyle='#c99a66';g.fillRect(hx-120,hy-130,240,130);g.fillStyle='#5a3a22';g.fillRect(hx-25,hy-85,50,85);
    g.fillStyle='#b0843f';g.beginPath();g.moveTo(hx-170,hy-120);g.quadraticCurveTo(hx,hy-270,hx+170,hy-120);g.closePath();g.fill();
    g.strokeStyle='rgba(90,60,20,.5)';g.lineWidth=3;for(let k=-150;k<=150;k+=20){g.beginPath();g.moveTo(hx+k,hy-120);g.lineTo(hx+k*.4,hy-195);g.stroke();}
    const banana=(x,y,s)=>{
      g.strokeStyle='#7a8a3a';g.lineWidth=14*s;g.beginPath();g.moveTo(x,y);g.lineTo(x+6*s,y-170*s);g.stroke();
      g.fillStyle='#3f8a35';[-1.3,-.65,0,.65,1.3].forEach(a=>{g.save();g.translate(x+6*s,y-170*s);g.rotate(a);g.beginPath();g.ellipse(0,-70*s,20*s,75*s,0,0,7);g.fill();g.restore();});
    };
    banana(w*.27,h*.8,1);banana(w*.31,h*.83,.8);banana(w*.95,h*.78,1.1);
    // bullock cart
    const cx=w*.44,cy=h*.9;
    g.strokeStyle='#5a3a22';g.lineWidth=8;g.beginPath();g.moveTo(cx-60,cy-80);g.lineTo(cx-215,cy-78);g.stroke();
    g.fillStyle='#b08a4a';g.beginPath();g.ellipse(cx+25,cy-92,90,62,0,Math.PI,2*Math.PI);g.fill();
    g.fillStyle='#7a4e2a';g.fillRect(cx-65,cy-95,180,20);
    g.lineWidth=10;g.beginPath();g.arc(cx+25,cy-40,50,0,7);g.stroke();
    g.lineWidth=4;for(let k=0;k<6;k++){const a=k*Math.PI/3;g.beginPath();g.moveTo(cx+25,cy-40);g.lineTo(cx+25+Math.cos(a)*50,cy-40+Math.sin(a)*50);g.stroke();}
    g.fillStyle='#8a5a3a';g.beginPath();g.ellipse(cx-190,cy-62,82,42,0,0,7);g.fill();
    g.beginPath();g.ellipse(cx-280,cy-80,32,24,-.3,0,7);g.fill();
    g.fillRect(cx-250,cy-35,14,48);g.fillRect(cx-215,cy-35,14,48);g.fillRect(cx-160,cy-35,14,48);g.fillRect(cx-128,cy-35,14,48);
    g.strokeStyle='#e9dcc0';g.lineWidth=6;g.beginPath();g.moveTo(cx-292,cy-98);g.lineTo(cx-305,cy-125);g.moveTo(cx-272,cy-100);g.lineTo(cx-265,cy-128);g.stroke();
    // woman in a red sari with a kolshi on her hip
    const wx=w*.73,wy=h*.95;
    g.fillStyle='#c8302b';g.beginPath();g.moveTo(wx-28,wy-150);g.lineTo(wx+28,wy-150);g.lineTo(wx+58,wy);g.lineTo(wx-58,wy);g.closePath();g.fill();
    g.fillStyle='#f3c242';g.fillRect(wx-58,wy-14,116,14);g.beginPath();g.moveTo(wx+28,wy-150);g.lineTo(wx-40,wy-60);g.lineTo(wx-28,wy-50);g.lineTo(wx+34,wy-138);g.fill();
    g.fillStyle='#9a6a46';g.beginPath();g.arc(wx,wy-176,24,0,7);g.fill();
    g.fillStyle='#1e1a18';g.beginPath();g.arc(wx+14,wy-188,14,0,7);g.fill();
    g.fillStyle='#b5652d';g.beginPath();g.arc(wx+52,wy-88,30,0,7);g.fill();g.fillRect(wx+42,wy-128,20,18);
    // brush texture and a painted border
    for(let i=0;i<6000;i++){g.fillStyle=Math.random()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.04)';g.fillRect(Math.random()*w,Math.random()*h,3,3);}
    g.strokeStyle='#7a4a2a';g.lineWidth=18;g.strokeRect(9,9,w-18,h-18);
  });
}
// A wall chart: coloured title strip and a grid of entries.
function chartCanvas(title,rows,bg,accent){
  return mkCanvas(384,512,(g,w,h)=>{
    g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=accent;g.fillRect(0,0,w,84);
    g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.font=`700 50px ${FONT_UI}`;g.fillText(title,w/2,46);
    const cols=rows[0].length,cw=(w-40)/cols,ch=(h-124)/rows.length;
    rows.forEach((r,i)=>r.forEach((t,j)=>{
      g.strokeStyle='rgba(0,0,0,.15)';g.lineWidth=2;g.strokeRect(20+j*cw,104+i*ch,cw,ch);
      g.fillStyle=['#c8302b','#2348b5','#2f7d4e','#8a4fa0'][(i+j)%4];g.font=`700 ${Math.round(Math.min(ch*.6,cw*.55))}px ${FONT_UI}`;g.fillText(t,20+j*cw+cw/2,104+i*ch+ch/2+3);
    }));
  });
}
function flagCanvas(){return mkCanvas(300,180,(g,w,h)=>{g.fillStyle='#006a4e';g.fillRect(0,0,w,h);g.fillStyle='#f42a41';g.beginPath();g.arc(w*.45,h/2,h*.33,0,7);g.fill();});}

/* ---------- outside the classroom ---------- */
const GROUND=-1.2; // the field is a step below the classroom floor
let flagWave=null;
function skyCanvas(){return mkCanvas(16,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#5d9fd8');gr.addColorStop(.42,'#a9d1ec');gr.addColorStop(.5,'#e4eef0');gr.addColorStop(.52,'#c9dcc4');gr.addColorStop(1,'#9ab98a');g.fillStyle=gr;g.fillRect(0,0,w,h);});}
function grassCanvas(){
  return mkCanvas(512,512,(g,w,h)=>{
    g.fillStyle='#5f9e3f';g.fillRect(0,0,w,h);
    for(let i=0;i<4;i++){g.fillStyle=i%2?'rgba(255,255,255,.05)':'rgba(0,0,0,.04)';g.fillRect(i*w/4,0,w/4,h);} // mowing stripes
    for(let i=0;i<14000;i++){g.fillStyle=['#4f8a33','#74b24c','#86bf5a','#3f7a2b'][i%4];g.fillRect(Math.random()*w,Math.random()*h,2,3);}
    for(let i=0;i<10;i++){const x=Math.random()*w,y=Math.random()*h,r=30+Math.random()*60,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(150,120,70,.18)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);} // worn patches
  });
}
function brickCanvas(){
  return mkCanvas(256,128,(g,w,h)=>{
    g.fillStyle='#c9c1b0';g.fillRect(0,0,w,h);
    for(let r=0;r<8;r++)for(let c=-1;c<5;c++){g.fillStyle=['#a5442c','#b0503a','#953d27'][(r+c+3)%3];g.fillRect(c*64+(r%2)*32+2,r*16+2,60,12);}
  });
}
// Front of the school building across the field: two floors of verandahs with pillars, maroon bands,
// and the school's name painted on a sign along the tall front parapet, high enough to clear the flag.
function facadeCanvas(){
  return mkCanvas(3072,768,(g,w,h)=>{
    const bays=14,bay=w/bays;
    g.fillStyle='#efe0b4';g.fillRect(0,0,w,h);
    [[h*.21,h*.56],[h*.62,h*.95]].forEach(([t,b],fi)=>{
      g.fillStyle='#bba982';g.fillRect(0,t,w,b-t);
      for(let i=0;i<bays;i++){
        const x=i*bay;
        if(i%3===1){g.fillStyle='#2f5f45';g.fillRect(x+bay*.3,t+(b-t)*.18,bay*.4,(b-t)*.82);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x+bay*.49,t+(b-t)*.18,bay*.02,(b-t)*.82);}
        else{g.fillStyle='#3a3530';g.fillRect(x+bay*.24,t+(b-t)*.3,bay*.52,(b-t)*.42);g.fillStyle='#8a8a86';for(let k=1;k<6;k++)g.fillRect(x+bay*.24+k*bay*.52/6,t+(b-t)*.3,3,(b-t)*.42);}
      }
      const sh=g.createLinearGradient(0,t,0,t+(b-t)*.3);sh.addColorStop(0,'rgba(0,0,0,.3)');sh.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=sh;g.fillRect(0,t,w,(b-t)*.3);
      if(fi===0){g.fillStyle='#8a3a2a';const rt=b-(b-t)*.32;g.fillRect(0,rt,w,10);for(let x=8;x<w;x+=26)g.fillRect(x,rt,8,b-rt);}
      for(let i=0;i<=bays;i++){const x=i*bay;g.fillStyle='#f4e8c4';g.fillRect(x-bay*.07,t,bay*.14,b-t);g.fillStyle='rgba(0,0,0,.14)';g.fillRect(x+bay*.04,t,bay*.03,b-t);}
    });
    g.fillStyle='#8a3a2a';g.fillRect(0,h*.56,w,h*.06);g.fillRect(0,h*.17,w,h*.04);
    g.fillStyle='#9a958a';g.fillRect(0,h*.95,w,h*.05);
    for(let i=0;i<40;i++){const x=(i*397)%w,gr=g.createLinearGradient(0,h*.62,0,h*.76);gr.addColorStop(0,'rgba(60,50,30,.12)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x,h*.62,14,h*.14);} // rain stains
    const sw=w*.22,sx=(w-sw)/2,st=h*.015,sh2=h*.135;g.fillStyle='#fbf8ee';g.fillRect(sx,st,sw,sh2);g.strokeStyle='#1f5a3a';g.lineWidth=10;g.strokeRect(sx+6,st+6,sw-12,sh2-12);
    const name='গুলাল বুদাই উচ্চ বিদ্যালয়';let fs=h*.085;g.font=`700 ${fs}px ${FONT_UI}`;while(g.measureText(name).width>sw-70){fs-=2;g.font=`700 ${fs}px ${FONT_UI}`;}
    g.fillStyle='#1f5a3a';g.textAlign='center';g.textBaseline='middle';g.fillText(name,w/2,st+sh2/2+4);
  });
}
// Outdoor trees. Each tree is merged into a few meshes (trunk with branches, canopy, and for palms the
// coconuts) so the field stays cheap on phones; canopies and palm crowns sit in pivot groups that swayTrees
// rocks in the wind. Shapes are seeded, so the field looks the same on every visit.
const swayers=[];let leafDrift=null;
let seed3=11;const rnd3=()=>(seed3=(seed3*16807)%2147483647)/2147483647;
// Joins geometries into one, each moved by its matrix and painted by colourOf(nx, ny, nz, x, y, z) -> THREE.Color.
function mergeGeos(parts,colourOf){
  const gs=parts.map(([geo,m])=>{const g=(geo.index?geo.toNonIndexed():geo.clone());g.applyMatrix4(m);if(!g.attributes.normal)g.computeVertexNormals();return g;});
  const n=gs.reduce((k,g)=>k+g.attributes.position.count,0),pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);
  let o=0;const c=new THREE.Color();
  gs.forEach((g,gi)=>{
    const p=g.attributes.position.array,q=g.attributes.normal.array;pos.set(p,o*3);nor.set(q,o*3);
    for(let i=0;i<p.length;i+=3){colourOf(c,q[i],q[i+1],q[i+2],p[i],p[i+1],p[i+2],gi);col[o*3+i]=c.r;col[o*3+i+1]=c.g;col[o*3+i+2]=c.b;}
    o+=p.length/3;g.dispose();
  });
  const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.BufferAttribute(pos,3));out.setAttribute('normal',new THREE.BufferAttribute(nor,3));out.setAttribute('color',new THREE.BufferAttribute(col,3));return out;
}
const M4=(x,y,z,sx,sy,sz,rx,ry,rz)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,ry||0,rz||0)),new THREE.Vector3(sx,sy||sx,sz||sx));
// A lumpy foliage clump: an icosahedron with each vertex pushed in or out by a hash of its position.
function clumpGeo(){
  const g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),h=Math.sin(x*12.9+y*78.2+z*37.7)*43758.5,k=.84+(h-Math.floor(h))*.3;p.setXYZ(i,x*k,y*k*.86,z*k);}
  g.computeVertexNormals();return g;
}
let treeKit=null;
function buildTreeKit(){
  const clump=clumpGeo(),bark=new THREE.Color(0x5a4330),barkDark=new THREE.Color(0x3e2e20);
  const greens=[0x2f6b2a,0x3f7f34,0x4f8f3a,0x5d9a40].map(h=>new THREE.Color(h));
  // three broadleaf canopies, each a dome of clumps around a centre one
  const canopies=[0,1,2].map(v=>{
    const parts=[[clump,M4(0,1.6,0,4.2,3.6,4.2)]],n=6+v;
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2+v,r=2.6+rnd3()*1.2,y=.4+rnd3()*2.2,s=1.8+rnd3()*1.4;parts.push([clump,M4(Math.cos(a)*r,y,Math.sin(a)*r,s,s*.85,s,0,rnd3()*3,0)]);}
    return mergeGeos(parts,(c,nx,ny,nz,x,y,z,gi)=>{c.copy(greens[(gi+v)%greens.length]).multiplyScalar(.62+.38*(ny*.5+.5)+ (y>3?.08:0));});
  });
  // trunk with two forked branches, flared at the foot
  const trunkParts=[[new THREE.CylinderGeometry(.42,.78,9,8),M4(0,4.5,0,1)],[new THREE.CylinderGeometry(.18,.34,4.2,6),M4(1.1,8.6,.2,1,1,1,0,0,-.62)],[new THREE.CylinderGeometry(.16,.3,3.8,6),M4(-1,8.4,-.3,1,1,1,.2,0,.58)]];
  const trunk=mergeGeos(trunkParts,(c,nx,ny)=>{c.copy(bark).lerp(barkDark,.5-nx*.5);});
  // palm: a gently curved trunk, ten drooping fronds and a coconut cluster
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.5,5,0),new THREE.Vector3(1.6,10,0),new THREE.Vector3(3,15.6,0)]);
  const palmTrunk=mergeGeos([[new THREE.TubeGeometry(curve,14,.42,7,false),new THREE.Matrix4()]],(c,nx,ny,nz,x,y)=>{c.copy(bark).lerp(barkDark,(Math.sin(y*5)*.5+.5)*.5);}); // ring marks
  const frond=new THREE.PlaneGeometry(1,1,10,2),fp=frond.attributes.position;
  for(let i=0;i<fp.count;i++){const u=fp.getX(i)+.5,w=fp.getY(i);fp.setXYZ(i,u*7.5,-u*u*3.2+u*.9,w*(1.6*Math.sin(Math.PI*Math.min(1,u*1.15))+.15));}
  frond.computeVertexNormals();
  const frondParts=[];for(let i=0;i<10;i++){const a=i/10*Math.PI*2+rnd3()*.3,lift=(rnd3()-.5)*.5;frondParts.push([frond,M4(0,0,0,1,1,1,0,a,lift)]);}
  const crown=mergeGeos(frondParts,(c,nx,ny)=>{c.copy(greens[2]).multiplyScalar(.7+.3*Math.abs(ny));});
  const nut=new THREE.SphereGeometry(.45,8,6),nuts=mergeGeos([0,1,2,3,4].map(i=>[nut,M4(Math.cos(i*1.3)*.55,-.5-(i%2)*.35,Math.sin(i*1.3)*.55,1)]),c=>{c.set(0x7a6a2a);});
  treeKit={canopies,trunk,palmTrunk,crown,nuts,
    leafM:new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.9}),
    barkM:new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),
    frondM:new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.85})};
}
function tree(x,z,s,v){
  if(!treeKit)buildTreeKit();const k=treeKit;
  const t=new THREE.Mesh(k.trunk,k.barkM);t.scale.setScalar(s);t.position.set(x,GROUND,z);t.rotation.y=rnd3()*6;scene.add(t); // outside the shadow camera: no shadows
  const pivot=new THREE.Group();pivot.position.set(x,GROUND+8.8*s,z);pivot.scale.setScalar(s);pivot.rotation.y=rnd3()*6;scene.add(pivot);
  pivot.add(new THREE.Mesh(k.canopies[v%3],k.leafM));
  swayers.push({o:pivot,amp:.035,ph:rnd3()*6.3,base:pivot.rotation.y});
}
function palm(x,z,s,turn){
  if(!treeKit)buildTreeKit();const k=treeKit;
  const t=new THREE.Mesh(k.palmTrunk,k.barkM);t.scale.setScalar(s);t.position.set(x,GROUND,z);t.rotation.y=turn;scene.add(t);
  const top=new THREE.Vector3(3,15.6,0).multiplyScalar(s).applyAxisAngle(new THREE.Vector3(0,1,0),turn);
  const pivot=new THREE.Group();pivot.position.set(x+top.x,GROUND+top.y,z+top.z);pivot.scale.setScalar(s);scene.add(pivot);
  pivot.add(new THREE.Mesh(k.crown,k.frondM),new THREE.Mesh(k.nuts,k.barkM));
  swayers.push({o:pivot,amp:.09,ph:rnd3()*6.3,base:0,palm:true});
}
// Leaves blowing across the field, as one point cloud seen through the door and windows.
function buildLeafDrift(){
  const n=70,pos=new Float32Array(n*3),col=new Float32Array(n*3),seeds=[];
  const tints=[0x6e9a3a,0x9aa83c,0xc9a23a,0x8a6a2e].map(h=>new THREE.Color(h));
  for(let i=0;i<n;i++){seeds.push({x:-120+rnd3()*190,y:GROUND+1+rnd3()*16,z:-60+rnd3()*160,sp:.7+rnd3()*.8,ph:rnd3()*6.3});const c=tints[i%4];col.set([c.r,c.g,c.b],i*3);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const leaf=mkCanvas(32,32,c=>{c.fillStyle='#fff';c.beginPath();c.ellipse(16,16,14,7,.6,0,7);c.fill();});
  const pts=new THREE.Points(g,new THREE.PointsMaterial({size:.7,map:tex(leaf),vertexColors:true,sizeAttenuation:true,transparent:true,alphaTest:.4,depthWrite:false}));pts.frustumCulled=false;scene.add(pts);
  leafDrift={pos:g.attributes.position,seeds};
}
// The wind: a breeze that rises into gusts every few seconds. 0 to 1.
const wind=t=>.45+.55*Math.max(0,Math.sin(t*.37)*Math.sin(t*.13+1.7));
// Rocks the canopies and palm crowns, and blows the drifting leaves; called every 3D frame.
function swayTrees(now){
  const t=now/1000,w=wind(t);
  for(const s of swayers){
    const a=s.amp*(.35+w)*(Math.sin(t*(s.palm?1.6:1.1)+s.ph)+.35*Math.sin(t*2.9+s.ph*2));
    s.o.rotation.z=a;s.o.rotation.x=a*.45;
  }
  if(!leafDrift)return;const {pos,seeds}=leafDrift;
  seeds.forEach((d,i)=>{
    const x=((d.x+t*d.sp*(3+9*w))%190+190)%190-120; // blows towards +x and wraps round
    const z=d.z+Math.sin(t*.9+d.ph)*3,inside=Math.abs(x)<31&&z>-14&&z<54; // never inside the classroom
    pos.setXYZ(i,x,inside?-500:d.y+Math.sin(t*1.7+d.ph)*1.2,z);
  });
  pos.needsUpdate=true;
}
// Sir, for "স্যার আসছেন!": a painted cut-out of the teacher (white shirt, dark trousers, glasses, the register
// under his arm and the cane) who walks along the verandah to the door, and his shadow falling into the room.
// placeSir(z, show, now) moves him; js/flow.js decides when.
let sirFig=null;
function sirCanvas(){
  return mkCanvas(256,600,(g,w,h)=>{
    const c=(x,y,r,col)=>{g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,7);g.fill();};
    g.fillStyle='#2b2f3a';g.fillRect(92,330,32,250);g.fillRect(132,330,32,250);            // trousers
    g.fillStyle='#1a1a1a';g.fillRect(86,570,42,22);g.fillRect(128,570,42,22);              // shoes
    g.fillStyle='#f3f1ea';g.beginPath();g.moveTo(80,150);g.lineTo(176,150);g.lineTo(182,340);g.lineTo(74,340);g.closePath();g.fill(); // shirt
    g.fillStyle='#e2ded2';g.fillRect(126,160,4,175);                                        // button line
    g.fillStyle='#3a2a20';g.fillRect(74,330,108,10);                                        // belt
    g.fillStyle='#f3f1ea';g.fillRect(58,156,26,120);g.fillRect(172,156,26,120);             // sleeves
    c(70,290,13,'#c99a72');c(186,290,13,'#c99a72');                                         // hands
    g.fillStyle='#7a1f22';g.fillRect(36,210,36,92);                                         // the register under his arm
    g.strokeStyle='#9a6a33';g.lineWidth=8;g.lineCap='round';g.beginPath();g.moveTo(186,290);g.lineTo(232,520);g.stroke(); // cane
    g.fillStyle='#c99a72';g.fillRect(118,124,20,30);c(128,92,40,'#c99a72');                 // neck and head
    g.fillStyle='#1f1a17';g.beginPath();g.arc(128,82,41,Math.PI*1.02,Math.PI*1.98);g.fill(); // hair
    g.fillStyle='#2a2320';g.fillRect(104,104,48,6);                                         // moustache
    g.strokeStyle='#111';g.lineWidth=3;g.strokeRect(102,82,20,14);g.strokeRect(134,82,20,14);g.beginPath();g.moveTo(122,88);g.lineTo(134,88);g.stroke(); // glasses
  });
}
function buildSir(){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(4.3,10),new THREE.MeshStandardMaterial({map:tex(sirCanvas()),transparent:true,alphaTest:.5,side:THREE.DoubleSide,roughness:.9}));
  m.rotation.y=Math.PI/2;m.visible=false;scene.add(m); // faces into the classroom (+x)
  const sh=new THREE.Mesh(new THREE.PlaneGeometry(9,3.4),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0,depthWrite:false}));
  sh.rotation.x=-Math.PI/2;sh.position.y=.03;sh.visible=false;scene.add(sh);
  sirFig={m,sh};
}
function placeSir(z,show,now){
  if(!sirFig)return;const {m,sh}=sirFig;
  m.visible=sh.visible=show;if(!show)return;
  m.position.set(-33.2,5+Math.abs(Math.sin(now/170))*.18,z);
  const k=clamp(1-Math.abs(z-5.5)/9,0,1);   // his shadow falls in through the door as he nears it
  sh.position.set(-25.5,.03,z);sh.material.opacity=.38*k;
}
// Field, school building, flag, trees and boundary wall seen through the door and windows.
function buildOutside(){
  const sky=new THREE.Mesh(new THREE.SphereGeometry(250,32,16),new THREE.MeshBasicMaterial({map:tex(skyCanvas()),side:THREE.BackSide,fog:false,depthWrite:false}));sky.position.set(0,0,20);sky.renderOrder=-1;scene.add(sky);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(600,600),mat(0xffffff,{map:tex(grassCanvas(),[50,50]),roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(0,GROUND,20);scene.add(ground);
  const concrete=mat(0xa8a49a,{roughness:.95});
  box(61.2,-GROUND-.02,66.8,concrete,0,(GROUND-.02)/2,20,false); // plinth under the classroom, just below the floor so they don't flicker
  box(7,-GROUND,70,concrete,-33.9,GROUND/2,20,false);   // verandah outside the door
  // school building across the field, facing the classroom door
  const cream=mat(0xefe0b4,{roughness:.9}),bH=31;
  const bld=new THREE.Mesh(new THREE.BoxGeometry(12,bH,110),[mat(0xffffff,{map:tex(facadeCanvas()),roughness:.9}),cream,mat(0x9a948a),cream,cream,cream]);
  bld.position.set(-100,GROUND+bH/2,5.5);scene.add(bld); // centred on the door (z 0 to 11), so the sign shows through it
  // flag on its pole in the middle of the field, in line with the door
  const fx=-56,fz=10,poleH=22,poleM=mat(0xe8e8e2,{metalness:.4,roughness:.4});
  box(5,.8,5,concrete,fx,GROUND+.4,fz,false);box(3,.8,3,concrete,fx,GROUND+1.2,fz,false);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.16,.24,poleH,10),poleM);pole.position.set(fx,GROUND+poleH/2,fz);scene.add(pole);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(.35,10,8),mat(0xd4af37,{metalness:.7,roughness:.3}));knob.position.set(fx,GROUND+poleH+.2,fz);scene.add(knob);
  const fw=7,fh=4.2,fg=new THREE.PlaneGeometry(fw,fh,28,12);fg.translate(fw/2,0,0); // hoist edge at x = 0
  const flag=new THREE.Mesh(fg,new THREE.MeshStandardMaterial({map:tex(flagCanvas()),side:THREE.DoubleSide,roughness:.8}));
  flag.rotation.y=Math.PI/2;flag.position.set(fx,GROUND+poleH-fh/2-.3,fz-.2);scene.add(flag);
  flagWave={pos:fg.attributes.position,base:Float32Array.from(fg.attributes.position.array),geo:fg};
  // trees, a couple of coconut palms, and the brick boundary wall seen through the windows
  [[-72,-12,1.1],[-80,50,1.4],[-64,58,1],[-86,-34,1.2],[48,2,1.1],[56,26,1.3],[46,50,1],[62,-16,1.2],[54,70,1.1],[-12,-42,1.3],[18,96,1.4]].forEach(([x,z,s],i)=>tree(x,z,s,i));
  [[-66,34,1,.4],[60,40,1.05,2.6],[44,-28,.95,4]].forEach(([x,z,s,turn])=>palm(x,z,s,turn));
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2,r=150+(i*37)%40;tree(Math.cos(a)*r,20+Math.sin(a)*r,1.6+(i%4)*.25,i);}
  buildLeafDrift();
  const brick=tex(brickCanvas(),[40,1.4]);box(1.2,6,170,mat(0xffffff,{map:brick}),80,GROUND+3,20,false);
}
// Waves the flag; called every 3D frame.
function waveFlag(now){
  if(!flagWave)return;const {pos,base}=flagWave,t=now/1000,w=wind(t),sp=3+2.5*w;
  // two travelling ripples that grow towards the fly end, a flutter of the fly end up and down, and a droop
  // of the free corner when the breeze drops: the cloth billows and curls instead of moving as one sheet
  for(let i=0;i<pos.count;i++){
    const x=base[i*3],y=base[i*3+1],f=x/7,g=f*f;
    const z=(Math.sin(x*1.15-t*sp+y*.35)*(.42+.4*w)+Math.sin(x*2.3-t*sp*1.7-y*.5)*(.1+.12*w))*(.2+.8*f);
    pos.setXYZ(i,x-Math.abs(z)*.3*f,y+Math.sin(x*1.3-t*sp*.9+y*.2)*.32*g*(.5+w)-(1-w)*.6*g,z); // wavy top and bottom edges
  }
  pos.needsUpdate=true;flagWave.geo.computeVertexNormals();
}
// Builds a side wall at x from boxes, leaving each opening [z0, z1, y0, y1] open to the outside.
function sideWall(x,holes,lowerM,upperM){
  const cuts=[-13,53,...holes.flatMap(h=>[h[0],h[1]])].sort((a,b)=>a-b);
  for(let i=0;i<cuts.length-1;i++){
    const a=cuts[i],b=cuts[i+1],zm=(a+b)/2;if(b-a<1e-3)continue;
    const h=holes.find(h=>zm>h[0]&&zm<h[1]);
    (h?[[0,h[2]],[h[3],32]]:[[0,32]]).forEach(([y0,y1])=>
      [[y0,Math.min(y1,8),lowerM],[Math.max(y0,8),y1,upperM]].forEach(([p,q,m])=>{if(q-p>1e-3)box(.4,q-p,b-a,m,x,(p+q)/2,zm,false);}));
  }
}

function mat(c,o){return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:0},o||{}));}
function box(w,h,d,m,x,y,z,cast){const me=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);me.position.set(x,y,z);me.castShadow=cast!==false;me.receiveShadow=true;scene.add(me);return me;}

function buildScene(){
  const cv=$('#c');
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(0xbcd9ec);scene.fog=new THREE.Fog(0xd3e3e6,110,260);
  camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.05,300);
  raycaster=new THREE.Raycaster();plane=new THREE.Plane(new THREE.Vector3(0,1,0),-TOP);

  scene.add(new THREE.HemisphereLight(0xfff4e0,0x5a3a2c,.62));
  scene.add(new THREE.AmbientLight(0xffffff,.16));
  const sun=new THREE.DirectionalLight(0xfff0d2,.85);sun.position.set(38,46,16);sun.target.position.set(0,TOP,0);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-18;sc.right=18;sc.top=18;sc.bottom=-18;sc.near=5;sc.far=120;sun.shadow.bias=-.0006;sun.shadow.normalBias=.02;
  scene.add(sun);scene.add(sun.target);
  const pl=new THREE.PointLight(0xfff6e6,.4,60);pl.position.set(0,26,3);scene.add(pl);

  const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,66),mat(0xffffff,{map:tex(ART.floor,[10,10]),roughness:.55}));floor.rotation.x=-Math.PI/2;floor.position.set(0,0,20);floor.receiveShadow=true;scene.add(floor);
  // whitewashed walls, a little greyer below the brown dado line
  const lower=mat(0xd2cdbb,{roughness:.95}),upper=mat(0xf2efe6,{roughness:.95}),trim=mat(0x6b3a22,{roughness:.7});
  box(60,8,.4,lower,0,4,-12.2,false);box(60,24,.4,upper,0,20,-12.2,false);
  box(60,8,.4,lower,0,4,53.2,false);box(60,24,.4,upper,0,20,53.2,false);
  // side walls: the door near the front of the left wall, a row of window openings on the right
  const DOOR=[0,11],DOOR_H=23,WIN_Z=[5,14,23,32,41,50];
  sideWall(-30.2,[[DOOR[0],DOOR[1],0,DOOR_H]],lower,upper);
  sideWall(30.2,WIN_Z.map(z=>[z-2.7,z+2.7,8.2,20.2]),lower,upper);
  box(60.8,.3,.5,trim,0,8.1,-11.9,false);box(60.8,.3,.5,trim,0,8.1,52.9,false);box(.5,.3,13,trim,-29.9,8.1,-6.5,false);box(.5,.3,42,trim,-29.9,8.1,32,false);box(.5,.3,66,trim,29.9,8.1,20,false);
  const ceil=new THREE.Mesh(new THREE.PlaneGeometry(60,66),mat(0xf2efe6,{roughness:1}));ceil.rotation.x=Math.PI/2;ceil.position.set(0,32,20);scene.add(ceil);
  box(46,DAIS,17,mat(0xb4ad9e,{roughness:.9}),0,DAIS/2,-3.5);
  box(46,.25,.4,mat(0x7c7568),0,DAIS-.1,5.0,false);

  // a row of tall wooden windows with iron grills on the right wall, with wall charts between them
  const winM=mat(0x5a2c1a,{roughness:.7}),barM=mat(0x2f3236,{metalness:.5,roughness:.4});
  const ww=5.4,wh=12,wy=14.2;
  WIN_Z.forEach(z=>{
    box(.3,.4,ww+.4,winM,29.85,wy+wh/2,z,false);box(.6,.3,ww+.8,winM,29.7,wy-wh/2-.05,z,false);
    box(.3,wh,.4,winM,29.85,wy,z-ww/2,false);box(.3,wh,.4,winM,29.85,wy,z+ww/2,false);
    box(.25,wh,.18,winM,29.85,wy,z,false);
    [-wh/4,0,wh/4].forEach(dy=>box(.25,.16,ww,winM,29.85,wy+dy,z,false));
    for(let i=-3;i<=3;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,wh,8),barM);b.position.set(29.6,wy,z+i*ww/7.4);scene.add(b);}
  });
  [[9.5,chartCanvas('স্বরবর্ণ',[['অ','আ','ই'],['ঈ','উ','ঊ'],['ঋ','এ','ঐ'],['ও','ঔ','']],'#fffdf3','#c8302b')],
   [27.5,chartCanvas('নামতা',[['২ × ১ = ২'],['২ × ২ = ৪'],['২ × ৩ = ৬'],['২ × ৪ = ৮'],['২ × ৫ = ১০']],'#fff7d6','#2348b5')],
   [45.5,chartCanvas('ব্যঞ্জনবর্ণ',[['ক','খ','গ'],['ঘ','ঙ','চ'],['ছ','জ','ঝ'],['ঞ','ট','ঠ']],'#eef8ff','#2f7d4e')]].forEach(([z,cv])=>{
    const p=new THREE.Mesh(new THREE.PlaneGeometry(2.4,3.2),mat(0xffffff,{map:tex(cv)}));p.rotation.y=-Math.PI/2;p.position.set(29.96,15.5,z);scene.add(p);
  });
  // village mural on the left wall
  const mural=new THREE.Mesh(new THREE.PlaneGeometry(20.5,9),mat(0xffffff,{map:tex(muralCanvas()),roughness:.95}));mural.rotation.y=Math.PI/2;mural.position.set(-29.97,14.2,33);scene.add(mural);
  // wooden double door, both leaves swung open into the room
  const doorM=mat(0x5a2c1a,{roughness:.7}),panelM=mat(0x4a2414,{roughness:.7}),lw=(DOOR[1]-DOOR[0])/2-.1;
  box(.8,DOOR_H,.45,doorM,-30.2,DOOR_H/2,DOOR[0]-.22,false);box(.8,DOOR_H,.45,doorM,-30.2,DOOR_H/2,DOOR[1]+.22,false);
  box(.8,.6,DOOR[1]-DOOR[0]+.9,doorM,-30.2,DOOR_H+.3,(DOOR[0]+DOOR[1])/2,false);
  [[DOOR[0],1],[DOOR[1],-1]].forEach(([hz,dir])=>{
    const g=new THREE.Group();g.position.set(-29.9,0,hz);
    const leaf=new THREE.Mesh(new THREE.BoxGeometry(.25,DOOR_H-.4,lw),doorM);leaf.position.set(0,(DOOR_H-.4)/2+.1,dir*lw/2);g.add(leaf);
    [[5.5,7.5],[15.5,10]].forEach(([y,h])=>{const p=new THREE.Mesh(new THREE.BoxGeometry(.35,h,lw*.7),panelM);p.position.set(0,y+(y>10?1:0),dir*lw/2);g.add(p);});
    g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});g.rotation.y=dir*1.25;scene.add(g);
  });
  const nb=new THREE.Mesh(new THREE.PlaneGeometry(10,7),mat(0xffffff,{map:tex(noticeCanvas())}));nb.rotation.y=Math.PI/2;nb.position.set(-29.85,16,17);scene.add(nb);
  box(.3,7.6,10.6,mat(0x5b3a1e),-30.05,16,17,false);
  const tubeM=new THREE.MeshBasicMaterial({color:0xfbfff8});
  [[-29.6,24],[-29.6,44],[29.6,32]].forEach(([x,z])=>{box(.4,.35,8.6,mat(0xdedad0),x+(x<0?-.15:.15),24,z,false);const t=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,8,12),tubeM);t.rotation.x=Math.PI/2;t.position.set(x+(x<0?.3:-.3),23.8,z);scene.add(t);});
  const wood=mat(0xffffff,{map:tex(ART.darkWood)});
  box(38.4,13.4,.4,wood,0,15,-11.85,false);
  boardTex=tex(boardCanvas());boardName=rival();
  const board=new THREE.Mesh(new THREE.PlaneGeometry(36,11),mat(0xffffff,{map:boardTex,roughness:.95}));board.position.set(0,15,-11.6);scene.add(board);
  box(36.4,.35,.9,wood,0,9.35,-11.3,true);
  [[-12,0xf8f6ee],[-11.3,0xf4d35e],[-10.7,0xf8f6ee],[-9.9,0xe88fa1]].forEach(([x,c],i)=>{const ch=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,1,10),mat(c));ch.rotation.z=Math.PI/2;ch.rotation.y=i*.3;ch.position.set(x,9.65,-11.2);ch.castShadow=true;scene.add(ch);});
  box(2.4,.7,1.0,mat(0x8a5a30),10,9.88,-11.25);box(2.4,.25,1.02,mat(0x3c3c44),10,9.5,-11.25);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(9.6,2),mat(0xffffff,{map:tex(signCanvas())}));sign.position.set(0,24,-11.95);scene.add(sign);
  const clk=new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,.3,40),[mat(0x5b3a1e),mat(0xffffff,{map:tex(clockCanvas())}),mat(0x5b3a1e)]);clk.rotation.set(Math.PI/2,0,0);clk.position.set(16,24,-11.8);scene.add(clk);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(4,2.4),mat(0xffffff,{map:tex(flagCanvas())}));flag.position.set(-16,24,-11.95);scene.add(flag);

  const top=mat(0xffffff,{map:tex(ART.tableWood),roughness:.82}); // old dull varnish
  box(HX*2+.5,.45,HZ*2+.5,top,0,TOP-.225,0);
  const legM=mat(0xffffff,{map:tex(ART.legWood),roughness:.92}),lh=TOP-DAIS-.45;
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>box(.6,lh,.6,legM,sx*(HX-.3),DAIS+lh/2,sz*(HZ-.3)));
  box(HX*2-.6,4.2,.2,legM,0,TOP-.45-2.1,HZ-.25);
  box(4,1.1,HZ*2-1,legM,HX-2.6,TOP-1.05,0);
  const ch=mat(0xffffff,{map:tex(ART.darkWood),roughness:.9}),cz=-7.6,seatY=DAIS+4.6;
  // Sir's chair: a traditional wooden armchair facing the class, with turned front legs, back posts that lean
  // back a little, a bowed top rail over three slats, armrests on turned spindles, an apron and rungs
  const chairPart=(geo,x,y,z,rx)=>{const m=new THREE.Mesh(geo,ch);m.position.set(x,y,z);if(rx)m.rotation.x=rx;m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;};
  const turned=(h,r)=>{const p=[[1,0],[1.15,.06],[.95,.12],[.8,.3],[1.1,.5],[.75,.62],[.8,.85],[1.2,.9],[1.2,1]].map(([k,f])=>new THREE.Vector2(r*k,h*f));return new THREE.LatheGeometry(p,12);};
  const legH=seatY-DAIS-.15;
  [-1.8,1.8].forEach(x=>{
    chairPart(turned(legH,.17),x,DAIS,cz+1.65);                                      // turned front leg
    const postH=legH+5.4;chairPart(new THREE.BoxGeometry(.32,postH,.32),x,DAIS+postH/2,cz-1.72,-.06); // back leg and post
    chairPart(new THREE.BoxGeometry(.18,.18,3.2),x,DAIS+1.1,cz);                      // side rung
    chairPart(turned(1.75,.11),x*1.02,seatY+.15,cz+1.45);                             // armrest spindle
    chairPart(new THREE.BoxGeometry(.42,.2,3.5),x*1.03,seatY+2,cz-.05);               // armrest
    chairPart(new THREE.CylinderGeometry(.21,.21,.42,12).rotateZ(Math.PI/2),x*1.03,seatY+2,cz+1.7); // rounded arm end
  });
  chairPart(new THREE.BoxGeometry(3.9,.18,.18),0,DAIS+1.1,cz+1.6);                    // front rung
  chairPart(new THREE.BoxGeometry(4.2,.3,3.9),0,seatY,cz);                            // seat
  chairPart(new THREE.BoxGeometry(3.6,.5,.12),0,seatY-.38,cz+1.82);                   // apron
  chairPart(new THREE.BoxGeometry(.12,.5,3.4),-1.75,seatY-.38,cz);chairPart(new THREE.BoxGeometry(.12,.5,3.4),1.75,seatY-.38,cz);
  const rail=new THREE.CatmullRomCurve3([new THREE.Vector3(-1.9,0,0),new THREE.Vector3(0,.18,-.32),new THREE.Vector3(1.9,0,0)]);
  chairPart(new THREE.TubeGeometry(rail,16,.2,8,false),0,seatY+5,cz-2.02);             // bowed top rail
  chairPart(new THREE.BoxGeometry(3.5,.3,.16),0,seatY+1.35,cz-1.86,-.06);             // lower back rail
  [-1,0,1].forEach(i=>chairPart(new THREE.BoxGeometry(.5,3.4,.09),i*1.05,seatY+3.15,cz-1.97+i*i*.05,-.06)); // back slats
  const cane=new THREE.Mesh(new THREE.CylinderGeometry(.09,.07,11,10),mat(0x9a6a33,{roughness:.6}));cane.rotation.z=Math.PI/2;cane.rotation.y=.35;cane.position.set(.5,seatY+.27,cz+.3);cane.castShadow=true;scene.add(cane);
  box(2.6,.35,3.4,mat(0x7a1f22),-.6,seatY+.35,cz-.3);

  // long high desks on thin legs with a book shelf, and a separate low bench behind each
  // rough old wood: carved desk tops (three variants), worn benches, dark scuffed legs, all matte
  const bw=mat(0xffffff,{map:tex(ART.benchWood,[3,1]),roughness:.95}),bl=mat(0xffffff,{map:tex(ART.legWood,[1,3]),roughness:.95});
  const deskM=ART.deskTops.map(c=>{const t=tex(c);t.center.set(.5,.5);t.rotation=Math.PI; // carvings read from the bench side
    return [bl,bl,mat(0xffffff,{map:t,roughness:.9}),bl,bl,bl];}); // carved top face, plain edges
  const bagCols=[0x2b5ea8,0x2f7d4e,0xb0352f,0x6b4fa0,0x222831],bookCols=[0x3d6fb6,0xc8302b,0x2f7d4e,0xe0a12a,0x8a4fa0];
  [-14,14].forEach((cx,ci)=>{[13,21,29,37,45].forEach((z,ri)=>{
    const k=ci*5+ri;
    const tilt=((k*7)%5-2)*.004; // nothing in an old classroom lines up perfectly
    box(16,.3,2.4,deskM[k%3],cx,7.3,z).rotation.y=tilt;box(16,.6,.12,bl,cx,6.85,z-1.14);box(16,.12,1.9,bl,cx,5.7,z+.05,false);
    [[-7.7,-1.05],[7.7,-1.05],[-7.7,1.05],[7.7,1.05]].forEach(([x,dz])=>box(.22,7.15,.22,bl,cx+x,3.58,z+dz));
    box(.16,.16,2.1,bl,cx-7.7,1.2,z,false);box(.16,.16,2.1,bl,cx+7.7,1.2,z,false);
    box(16,.3,1.4,bw,cx,4.3,z+2.75).rotation.y=-tilt*1.5;
    [[-7.6,2.25],[7.6,2.25],[-7.6,3.25],[7.6,3.25]].forEach(([x,dz])=>box(.2,4.15,.2,bl,cx+x,2.08,z+dz));
    // bags on the benches; books, exercise books and pencil boxes on the desks
    if(k%2===0){const bag=box(2.2,2.6,1.2,mat(bagCols[k%5]),cx-4+ri*1.5,5.75,z+2.75);bag.rotation.y=(ri-2)*.2;}
    box(1.6,.14,2.1,mat(bookCols[k%5]),cx-5+(k%3),7.52,z-.1).rotation.y=(k%3-1)*.25;
    if(ri%2===1){box(2.6,.06,1.8,mat(0xf4efe2),cx+2.2,7.48,z,false).rotation.y=.08;box(.04,.07,1.8,mat(0x9aa6b8),cx+2.2,7.5,z,false).rotation.y=.08;}
    if(k%3===0)box(1.5,.3,.5,mat(0xe07aa0),cx+5.6,7.6,z-.6);
  });});

  buildOutside();buildSir();

  const fanM=mat(0x6f6a52,{roughness:.6,metalness:.2});
  [[0,2],[0,28],[-14,42],[14,42]].forEach(([x,z])=>{
    const g=new THREE.Group();g.position.set(x,32,z);
    const rod=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,3,8),fanM);rod.position.y=-1.5;g.add(rod);
    const rot=new THREE.Group();rot.position.y=-3.2;g.add(rot);
    rot.add(new THREE.Mesh(new THREE.CylinderGeometry(.9,.75,.7,20),fanM));
    for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(6.8,.07,1.2),fanM);b.position.x=3.9;b.rotation.x=.12;const arm=new THREE.Group();arm.rotation.y=i*Math.PI*2/3;arm.add(b);rot.add(arm);}
    // no shadows: sunlight through the windows would project the blades onto the floor like a fan lying there
    scene.add(g);fans.push(rot);
  });

  arrow=new THREE.Group();
  const am=new THREE.MeshBasicMaterial({color:0x3ad17a,transparent:true,opacity:.92,depthTest:false});
  const shaft=new THREE.Mesh(new THREE.BoxGeometry(1,.04,.14),am);shaft.name='shaft';arrow.add(shaft);
  const hg=new THREE.ConeGeometry(.28,.6,16);hg.rotateZ(-Math.PI/2);const head=new THREE.Mesh(hg,am);head.name='head';arrow.add(head);
  shaft.renderOrder=head.renderOrder=10;arrow.visible=false;scene.add(arrow);arrow.userData.mat=am;
  const lg=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,0,0],3));
  pullLine=new THREE.Line(lg,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.55,depthTest:false}));pullLine.visible=false;pullLine.renderOrder=9;scene.add(pullLine);
}
// Same parts and proportions as drawPen2D: tip at -L/2, posted cap at +L/2.
function labelCanvas(txt,ink){return mkCanvas(512,64,g=>{g.font=`700 46px ${FONT_UI}`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=ink;g.fillText(txt,256,36,480);});}
// A capped pen, front (cap) towards -x, built to match drawPen2D: barrel (opaque, see-through with the refill
// inside, or six-sided), rubber grip, print, end plug, then the cap (lathe-turned with a domed top), lip ring
// and clip. Under a clear cap the grip, cone and tip show through.
function makePenMesh(d){
  const outer=new THREE.Group(),inner=new THREE.Group();outer.add(inner);
  const L=d.L,r=d.r,xf=-L/2,xb=L/2,capLen=L*(d.capLen||.3),lip=xf+capLen,rc=r*1.12;
  const endLen=L*(d.endLen||.035),b0=lip-r*.6,b1=xb-endLen,grip=d.rubber?L*.2:0;
  const add=(geo,m,x,y)=>{const me=new THREE.Mesh(geo,m);me.position.set(x,y||0,0);me.castShadow=!m.transparent;me.receiveShadow=true;inner.add(me);return me;};
  const cyl=(r0,len,seg,r1)=>{const g=new THREE.CylinderGeometry(r0,r1==null?r0:r1,len,seg||24);g.rotateZ(Math.PI/2);return g;}; // r0 at -x, r1 at +x
  const std=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.32},o||{}));
  const clear=(c,op)=>std(c,{transparent:true,opacity:op,roughness:.12,depthWrite:false});
  const metal=c=>std(c,{metalness:.6,roughness:.25});
  // barrel and what is inside it
  const seg=d.hex?6:24;
  if(d.clear){add(cyl(r,b1-b0,seg),clear(d.body,.55),(b0+b1)/2);add(cyl(r*.2,b1-b0),std(d.ink,{roughness:.4}),(b0+b1)/2);}
  else add(cyl(r,b1-b0,seg),std(d.body,{flatShading:!!d.hex,roughness:.38}),(b0+b1)/2);
  if(d.rubber)add(cyl(r*1.06,grip),std(d.rubber,{roughness:.95}),lip+grip/2);
  if(d.label){
    const lw=(b1-lip-grip)*.72,lm=new THREE.Mesh(new THREE.PlaneGeometry(lw,r*1.1),new THREE.MeshBasicMaterial({map:tex(labelCanvas(d.label,d.labelInk||'#222')),transparent:true,depthWrite:false}));
    lm.rotation.x=-Math.PI/2;lm.position.set((lip+grip+b1)/2,r*1.01,0);inner.add(lm);
  }
  // end plug with a rounded end
  const ec=d.end||d.cap||d.body,em=d.capMetal&&ec===d.cap?metal(ec):d.capClear&&ec===d.cap?clear(ec,.6):std(ec);
  add(cyl(r*.97,endLen),em,b1+endLen/2);const dome=new THREE.SphereGeometry(r*.97,20,10,0,Math.PI*2,0,Math.PI/2);dome.scale(1,.35,1);dome.rotateZ(-Math.PI/2);add(dome,em,xb);
  if(d.trim)add(cyl(r*1.02,L*.018),metal(d.trim),b1+L*.009);
  // under a clear cap: grip section, cone and tip
  if(d.capClear){
    const nl=L*(d.noseLen||.13),nx=lip-nl,cone=L*.04,nm=d.noseClear?clear(d.nose,.7):std(d.nose||d.rubber||d.body);
    add(cyl(r*.62,nl,24,r*.9),nm,nx+nl/2);if(d.noseClear)add(cyl(r*.15,nl),std(d.ink),nx+nl/2);
    add(cyl(r*.12,cone,24,r*.62),metal(d.tip||'#b8bcc2'),nx-cone/2);add(cyl(r*.08,L*.025),metal(d.tip||'#9aa0a8'),nx-cone-L*.0125);
  }
  // the cap: a lathe profile from the lip (open end) to the domed top
  const pts=[];pts.push(new THREE.Vector2(rc,0));pts.push(new THREE.Vector2(rc,capLen-rc*.9));
  for(let i=1;i<=8;i++){const t=i/8*Math.PI/2;pts.push(new THREE.Vector2(rc*Math.cos(t),capLen-rc*.9+rc*.9*Math.sin(t)));}
  const capGeo=new THREE.LatheGeometry(pts,28);capGeo.rotateZ(Math.PI/2); // its axis now runs towards -x
  const capM=d.capMetal?std(d.cap,{metalness:.4,roughness:.3}): // brushed steel; the scene has no environment map to reflect
    d.capClear?clear(d.cap,.35):std(d.cap,{roughness:.3});
  capM.side=THREE.DoubleSide;add(capGeo,capM,lip);
  const ring=d.trim||d.capRing;if(ring)add(cyl(rc*1.03,L*.022),metal(ring),lip-L*.011);
  // clip along the top of the cap, ending in a bead
  const cc=d.trim||d.clip||d.cap,c0=xf+L*.035,c1=xf+L*(d.clipLen||.27);
  const cm=d.trim?metal(cc):d.capMetal?std(cc,{metalness:.5,roughness:.3}):d.capClear?clear(cc,.6):std(cc,{roughness:.25});
  add(new THREE.BoxGeometry(c1-c0,r*.22,r*.42),cm,(c0+c1)/2,rc+r*.13);
  add(new THREE.SphereGeometry(r*.24,12,8),cm,c1-r*.15,rc+r*.18);
  scene.add(outer);return {outer,inner};
}
function makeRing(color){
  const g=new THREE.RingGeometry(.92,1,64);g.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.5,depthWrite:false}));
  m.position.y=TOP+.01;m.visible=false;scene.add(m);return m;
}

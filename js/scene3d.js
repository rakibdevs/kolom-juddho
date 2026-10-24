// three.js r128 classroom, pen meshes and aim rings.
"use strict";

let renderer,scene,camera,raycaster,plane,arrow,pullLine,fans=[];
const cam={yaw:0.12,pitch:0.82,dist:15,tx:0,ty:TOP,tz:0};
const CAM0={yaw:0.12,pitch:0.82,dist:15};
function tex(canvas,rep){const t=new THREE.CanvasTexture(canvas);t.anisotropy=8;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}return t;}
function chalkText(g,txt,x,y,size,color,align){
  g.font=`600 ${size}px ${FONT_CHALK}`;g.textAlign=align||'left';g.textBaseline='middle';g.fillStyle=color||'#f2f1ea';
  for(let k=0;k<4;k++){g.globalAlpha=.22;g.fillText(txt,x+(Math.random()-.5)*3,y+(Math.random()-.5)*3);}
  g.globalAlpha=.85;g.fillText(txt,x,y);g.globalAlpha=1;
}
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
    chalkText(g,'যারা কথা বলেছে: রাশেদ, তুহিন, মিতু',w-64,566,40,'#f6b2a8','right');
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
    const paper=(x,y,pw,ph,rot,c,lines)=>{g.save();g.translate(x,y);g.rotate(rot);g.fillStyle=c;g.fillRect(0,0,pw,ph);g.fillStyle='#2a2a2a';g.font=`600 27px ${FONT_CHALK}`;lines.forEach((l,i)=>g.fillText(l,14,36+i*32));g.fillStyle='#c0392b';g.beginPath();g.arc(pw/2,8,7,0,7);g.fill();g.restore();};
    paper(24,30,240,180,-.04,'#fffdf5',['ক্লাস রুটিন','১ম: বাংলা','২য়: গণিত','টিফিন: ১১:৩০']);
    paper(282,46,200,130,.05,'#fff3b8',['বার্ষিক','ক্রীড়া','প্রতিযোগিতা']);
    paper(290,200,190,130,-.03,'#d9f0ff',['নীরবতা','পালন করুন']);
  });
}
function flagCanvas(){return mkCanvas(300,180,(g,w,h)=>{g.fillStyle='#006a4e';g.fillRect(0,0,w,h);g.fillStyle='#f42a41';g.beginPath();g.arc(w*.45,h/2,h*.33,0,7);g.fill();});}

function mat(c,o){return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:0},o||{}));}
function box(w,h,d,m,x,y,z,cast){const me=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);me.position.set(x,y,z);me.castShadow=cast!==false;me.receiveShadow=true;scene.add(me);return me;}

function buildScene(){
  const cv=$('#c');
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x2a2a26);scene.fog=new THREE.Fog(0x3a3630,70,140);
  camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.05,300);
  raycaster=new THREE.Raycaster();plane=new THREE.Plane(new THREE.Vector3(0,1,0),-TOP);

  scene.add(new THREE.HemisphereLight(0xfff4e0,0x5a3a2c,.62));
  scene.add(new THREE.AmbientLight(0xffffff,.16));
  const sun=new THREE.DirectionalLight(0xfff0d2,.85);sun.position.set(38,46,16);sun.target.position.set(0,TOP,0);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-18;sc.right=18;sc.top=18;sc.bottom=-18;sc.near=5;sc.far=120;sun.shadow.bias=-.0006;sun.shadow.normalBias=.02;
  scene.add(sun);scene.add(sun.target);
  const pl=new THREE.PointLight(0xfff6e6,.4,60);pl.position.set(0,26,3);scene.add(pl);

  const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,66),mat(0xffffff,{map:tex(ART.floor,[10,10]),roughness:.55}));floor.rotation.x=-Math.PI/2;floor.position.set(0,0,20);floor.receiveShadow=true;scene.add(floor);
  const lower=mat(0x7fae8c,{roughness:.95}),upper=mat(0xeee6cc,{roughness:.95});
  box(60,8,.4,lower,0,4,-12.2,false);box(60,24,.4,upper,0,20,-12.2,false);
  box(60,8,.4,lower,0,4,53.2,false);box(60,24,.4,upper,0,20,53.2,false);
  box(.4,8,66,lower,-30.2,4,20,false);box(.4,24,66,upper,-30.2,20,20,false);
  box(.4,8,66,lower,30.2,4,20,false);box(.4,24,66,upper,30.2,20,20,false);
  box(60.8,.3,.5,mat(0x4e7a5b),0,8.1,-11.9,false);
  const ceil=new THREE.Mesh(new THREE.PlaneGeometry(60,66),mat(0xf2efe6,{roughness:1}));ceil.rotation.x=Math.PI/2;ceil.position.set(0,32,20);scene.add(ceil);
  box(46,DAIS,17,mat(0x9a948a,{roughness:.9}),0,DAIS/2,-3.5);
  box(46,.25,.4,mat(0x6e695f),0,DAIS-.1,5.0,false);

  const frameM=mat(0x2f5f86,{roughness:.6}),skyM=new THREE.MeshBasicMaterial({color:0xd8ecff}),barM=mat(0x333a40,{metalness:.5,roughness:.4});
  [10,25,40].forEach(z=>{
    box(.3,11,8,frameM,29.85,15,z,false);
    const sky=new THREE.Mesh(new THREE.PlaneGeometry(7,10),skyM);sky.rotation.y=-Math.PI/2;sky.position.set(29.6,15,z);scene.add(sky);
    for(let i=-3;i<=3;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,10,8),barM);b.position.set(29.4,15,z+i);scene.add(b);}
    box(.2,.15,7,barM,29.4,12,z,false);box(.2,.15,7,barM,29.4,18,z,false);
    const sh=mat(0x3a6d92,{roughness:.7});
    box(.2,10,3.6,sh,28.0,15,z-5.2,false).rotation.y=.8;
    box(.2,10,3.6,sh,28.0,15,z+5.2,false).rotation.y=-.8;
  });
  box(.3,15,7,mat(0xffffff,{map:tex(ART.darkWood)}),-29.85,7.5,46,false);
  const nb=new THREE.Mesh(new THREE.PlaneGeometry(10,7),mat(0xffffff,{map:tex(noticeCanvas())}));nb.rotation.y=Math.PI/2;nb.position.set(-29.9,16,14);scene.add(nb);
  box(.3,7.6,10.6,mat(0x5b3a1e),-30.05,16,14,false);
  const tubeM=new THREE.MeshBasicMaterial({color:0xfbfff8});
  [[-29.6,8],[-29.6,32],[29.6,32]].forEach(([x,z])=>{box(.4,.35,8.6,mat(0xdedad0),x+(x<0?-.15:.15),24,z,false);const t=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,8,12),tubeM);t.rotation.x=Math.PI/2;t.position.set(x+(x<0?.3:-.3),23.8,z);scene.add(t);});
  const wood=mat(0xffffff,{map:tex(ART.darkWood)});
  box(38.4,13.4,.4,wood,0,15,-11.85,false);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(36,11),mat(0xffffff,{map:tex(boardCanvas()),roughness:.95}));board.position.set(0,15,-11.6);scene.add(board);
  box(36.4,.35,.9,wood,0,9.35,-11.3,true);
  [[-12,0xf8f6ee],[-11.3,0xf4d35e],[-10.7,0xf8f6ee],[-9.9,0xe88fa1]].forEach(([x,c],i)=>{const ch=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,1,10),mat(c));ch.rotation.z=Math.PI/2;ch.rotation.y=i*.3;ch.position.set(x,9.65,-11.2);ch.castShadow=true;scene.add(ch);});
  box(2.4,.7,1.0,mat(0x8a5a30),10,9.88,-11.25);box(2.4,.25,1.02,mat(0x3c3c44),10,9.5,-11.25);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(9.6,2),mat(0xffffff,{map:tex(signCanvas())}));sign.position.set(0,24,-11.95);scene.add(sign);
  const clk=new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,.3,40),[mat(0x5b3a1e),mat(0xffffff,{map:tex(clockCanvas())}),mat(0x5b3a1e)]);clk.rotation.set(Math.PI/2,0,0);clk.position.set(16,24,-11.8);scene.add(clk);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(4,2.4),mat(0xffffff,{map:tex(flagCanvas())}));flag.position.set(-16,24,-11.95);scene.add(flag);

  const top=mat(0xffffff,{map:tex(ART.tableWood,[1.6,1]),roughness:.5});
  box(HX*2+.5,.45,HZ*2+.5,top,0,TOP-.225,0);
  const legM=mat(0xffffff,{map:tex(ART.legWood)}),lh=TOP-DAIS-.45;
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>box(.6,lh,.6,legM,sx*(HX-.3),DAIS+lh/2,sz*(HZ-.3)));
  box(HX*2-.6,4.2,.2,legM,0,TOP-.45-2.1,HZ-.25);
  box(4,1.1,HZ*2-1,legM,HX-2.6,TOP-1.05,0);
  const ch=mat(0xffffff,{map:tex(ART.darkWood)}),cz=-7.6,seatY=DAIS+4.6;
  box(4.2,.35,4,ch,0,seatY,cz);
  [[-1.8,-1.7],[1.8,-1.7],[-1.8,1.7],[1.8,1.7]].forEach(([x,z])=>box(.3,4.5,.3,ch,x,DAIS+2.25,cz+z));
  box(4.2,5,.3,ch,0,seatY+2.6,cz-1.85);
  const cane=new THREE.Mesh(new THREE.CylinderGeometry(.09,.07,11,10),mat(0x9a6a33,{roughness:.6}));cane.rotation.z=Math.PI/2;cane.rotation.y=.35;cane.position.set(.5,seatY+.27,cz+.3);cane.castShadow=true;scene.add(cane);
  box(2.6,.35,3.4,mat(0x7a1f22),-.6,seatY+.35,cz-.3);

  const bw=mat(0xffffff,{map:tex(ART.benchWood,[2,1])}),bl=mat(0x5f3a1c);
  const bagCols=[0x2b5ea8,0x2f7d4e,0xb0352f,0x6b4fa0];
  [-14,14].forEach((cx,ci)=>{[13,21,29,37,45].forEach((z,ri)=>{
    box(16,.35,3,bw,cx,7.3,z);box(16,3,.25,bw,cx,5.6,z-1.4);box(16,.2,2.6,bl,cx,5.0,z+.1);
    [[-7.6,-1.3],[7.6,-1.3],[-7.6,1.3],[7.6,1.3]].forEach(([x,dz])=>box(.4,7.1,.4,bl,cx+x,3.55,z+dz));
    box(16,.35,2,bw,cx,4.3,z+3.1);
    [[-7.6,2.4],[7.6,2.4],[-7.6,3.8],[7.6,3.8]].forEach(([x,dz])=>box(.35,4.1,.35,bl,cx+x,2.05,z+dz));
    if((ci+ri)%2===0){const bag=box(2.2,2.6,1.2,mat(bagCols[(ci*5+ri)%4]),cx-4+ri*1.5,5.8,z+3.1);bag.rotation.y=(ri-2)*.2;}
    if(ri%2===1){box(2.4,.25,1.8,mat(0xefe4c8),cx+3,7.6,z-.2);box(2.4,.08,1.8,mat(0x3d6fb6),cx+3,7.47,z-.2);}
  });});

  const fanM=mat(0x6f6a52,{roughness:.6,metalness:.2});
  [[0,2],[0,28],[-14,42],[14,42]].forEach(([x,z])=>{
    const g=new THREE.Group();g.position.set(x,32,z);
    const rod=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,3,8),fanM);rod.position.y=-1.5;g.add(rod);
    const rot=new THREE.Group();rot.position.y=-3.2;g.add(rot);
    rot.add(new THREE.Mesh(new THREE.CylinderGeometry(.9,.75,.7,20),fanM));
    for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(6.8,.07,1.2),fanM);b.position.x=3.9;b.rotation.x=.12;const arm=new THREE.Group();arm.rotation.y=i*Math.PI*2/3;arm.add(b);rot.add(arm);}
    g.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(g);fans.push(rot);
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
function makePenMesh(d){
  const outer=new THREE.Group(),inner=new THREE.Group();outer.add(inner);
  const L=d.L,r=d.r;
  const add=(geo,m,x,y)=>{const me=new THREE.Mesh(geo,m);me.position.set(x,y||0,0);me.castShadow=true;me.receiveShadow=true;inner.add(me);return me;};
  const cyl=(rad,len,seg)=>{const g=new THREE.CylinderGeometry(rad,rad,len,seg||24);g.rotateZ(Math.PI/2);return g;};
  const std=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.32},o||{}));
  const tl=L*(d.nib?.13:.1),capLen=L*.34,x0=-L/2+tl,x1=L/2-capLen,nose=d.nose?L*.07:0,grip=d.rubber?L*.2:0,bodyLen=x1-x0;
  const metal=std(d.tip,{metalness:.85,roughness:.28});
  if(d.nib){
    const nb=new THREE.ConeGeometry(r*.95,tl,24);nb.scale(.35,1,1);nb.rotateZ(Math.PI/2);add(nb,metal,-L/2+tl/2,-r*.15);
    add(cyl(r*.55,tl*.7),std(0x111111),-L/2+tl*.65,-r*.35);
  } else {const cone=new THREE.ConeGeometry(r*.85,tl,24);cone.rotateZ(Math.PI/2);add(cone,metal,-L/2+tl/2);}
  const seg=d.hex?6:24;
  if(d.clear){add(cyl(r,bodyLen,seg),std(d.body,{transparent:true,opacity:.5,roughness:.15,flatShading:!!d.hex}),(x0+x1)/2);add(cyl(r*.32,bodyLen*.95),std(d.ink,{roughness:.4}),(x0+x1)/2);}
  else add(cyl(r,bodyLen,seg),std(d.body,{flatShading:!!d.hex}),(x0+x1)/2);
  if(d.nose)add(cyl(r*1.03,nose),std(d.nose),x0+nose/2);
  if(d.rubber)add(cyl(r*1.1,grip),std(d.rubber,{roughness:.95}),x0+grip/2);
  if(d.label&&!d.clear){
    const lw=(bodyLen-nose-grip)*.7,lm=new THREE.Mesh(new THREE.PlaneGeometry(lw,r*1.1),new THREE.MeshBasicMaterial({map:tex(labelCanvas(d.label,d.labelInk||'#222')),transparent:true,depthWrite:false}));
    lm.rotation.x=-Math.PI/2;lm.position.set((x0+nose+grip+x1)/2,r*1.01,0);inner.add(lm);
  }
  const capM=std(d.cap,{roughness:.3,metalness:d.trim?.3:0});
  add(cyl(r*1.13,capLen),capM,x1+capLen/2);add(cyl(r*.95,L*.02),capM,L/2+L*.01);
  const clipM=d.trim?std(d.trim,{metalness:.9,roughness:.25}):d.clip&&d.clip!==d.cap?std(d.clip,{metalness:.5,roughness:.35}):std(d.cap,{roughness:.2});
  add(new THREE.BoxGeometry(capLen*.8,r*.25,r*.4),clipM,x1+capLen*.55,r*1.13+r*.12);
  if(d.trim){add(cyl(r*1.17,L*.025),clipM,x1+L*.012);add(cyl(r*.5,L*.02),clipM,L/2+L*.025);}
  scene.add(outer);return {outer,inner};
}
function makeRing(color){
  const g=new THREE.RingGeometry(.92,1,64);g.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.5,depthWrite:false}));
  m.position.y=TOP+.01;m.visible=false;scene.add(m);return m;
}

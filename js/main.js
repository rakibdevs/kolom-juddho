// Fixed-step loop and boot.
"use strict";

/* ================= loop ================= */
let acc=0,last=performance.now();
function sync3D(now){
  fans.forEach(f=>f.rotation.y+=.15);waveFlag(now);
  pens.forEach((p,i)=>{
    const m=meshes[i];if(!m)return;
    m.outer.position.set(p.x,p.falling?p.falling.y:TOP+p.r,p.z);m.outer.rotation.y=-p.a;
    const rg=rings[i],show=G.matchLive&&G.turn===i&&(G.state==='aim'||G.state==='cpu')&&!p.out;
    rg.visible=show;if(show){rg.position.x=p.x;rg.position.z=p.z;rg.material.opacity=.35+.25*Math.sin(now/220);}
  });
  const a=G.aimVis;
  if(a){
    const len=.5+a.power*3.2*(a.sup?1.3:1);arrow.visible=true;arrow.position.set(a.cx,TOP+.18,a.cz);arrow.rotation.set(0,-a.ang,0);
    const sh=arrow.getObjectByName('shaft'),hd=arrow.getObjectByName('head');sh.scale.x=len;sh.position.x=len/2;hd.position.x=len+.28;
    if(a.sup)arrow.userData.mat.color.set(0xffc61a);else arrow.userData.mat.color.setHSL((1-a.power)*.33,.9,.52);
    if(a.px!=null){const pos=pullLine.geometry.attributes.position;pos.setXYZ(0,a.cx,TOP+.15,a.cz);pos.setXYZ(1,a.px,TOP+.15,a.pz);pos.needsUpdate=true;pullLine.visible=true;}else pullLine.visible=false;
  } else {arrow.visible=false;pullLine.visible=false;}
  camPos(cam.yaw,cam.pitch,cam.dist,camera.position);
  camera.lookAt(cam.tx,cam.ty,cam.tz);
  renderer.render(scene,camera);
}
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(G.state==='cpu'&&G.cpuAnim){
    const a=G.cpuAnim,k=(now-a.t0)/750;
    G.aimVis={cx:a.cx,cz:a.cz,ang:a.plan.ang,power:a.plan.power*Math.min(1,k)};
    if(k>1.25){G.cpuAnim=null;doShot(1,a.plan.s,Math.cos(a.plan.ang),Math.sin(a.plan.ang),a.plan.power);}
  }
  if(G.state==='moving'){
    acc+=dt;const h=1/480;let n=0;
    while(acc>=h&&n<500){physStep(pens,h,hitSound);acc-=h;n++;}
    pens.forEach((p,i)=>{if(p.out&&!p.falling)startFall(i);});
    if(atRest(pens)&&pens.every(p=>!p.falling||p.falling.done)){G.restT+=dt;if(G.restT>.45)endTurn();}else G.restT=0;
  }
  pens.forEach((p,i)=>{
    const f=p.falling;if(!f||f.done)return;
    f.vy-=45*dt;f.y+=f.vy*dt;p.x+=f.vx*dt;p.z+=f.vz*dt;
    if(meshes[i]){const inn=meshes[i].inner;inn.rotation.x+=f.roll*dt;inn.rotation.z+=f.tiltV*dt;}
    p.a+=f.roll*.08*dt;
    const onDais=Math.abs(p.x)<23&&p.z<5&&p.z>-12,fl=(onDais?DAIS:0)+p.r;
    if(f.y<=fl){f.y=fl;f.done=true;if(meshes[i])meshes[i].inner.rotation.z=0;snap(.7,1300,.12,900);setTimeout(()=>snap(.35,1800,.08),110);buzz([30,40,20]);}
  });
  if(!$('#menu').hidden||!$('#endScreen').hidden)return;
  tutor.place();
  if(G.view==='3d'&&has3D&&!G.glLost)sync3D(now);else draw2D(now);
}

/* ================= boot ================= */
async function init(){
  try{await Promise.race([Promise.all([document.fonts.load('600 64px Atma','আজকের পড়া'),document.fonts.load('700 64px Atma','হাজিরা'),document.fonts.load('700 64px "Baloo Da 2"','জ্ঞানই'),document.fonts.load('400 32px Kalam','Pen')]),new Promise(r=>setTimeout(r,3000))]);}catch(e){}
  buildArt();loadNames(); // before the scene, so the board names a renamed Rashed
  if(window.THREE){try{buildScene();v3=new THREE.Vector3();ndc=new THREE.Vector2();}catch(e){has3D=false;}}else has3D=false;
  if(!has3D)G.view='2d';
  wireMenu();
  [has3D?renderer.domElement:null,c2].forEach(cv=>{
    if(!cv)return;
    cv.addEventListener('pointerdown',onDown);cv.addEventListener('pointermove',onMove);
    cv.addEventListener('pointerup',onUp);cv.addEventListener('pointercancel',onUp);
    cv.addEventListener('contextmenu',e=>e.preventDefault());
  });
  if(has3D)renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();cam.dist=clamp(cam.dist*(1+e.deltaY*.001),6,45);cam.user=true;},{passive:false});
  // Phones can drop the WebGL context under memory pressure. Fall back to 2D so the game keeps going.
  if(has3D){
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();G.glLost=true;if(G.view==='3d'){setView('2d');if(G.matchLive)toast('3D থেমে গেছে','2D-তে খেলা চলছে');}});
    renderer.domElement.addEventListener('webglcontextrestored',()=>{G.glLost=false;});
  }
  addEventListener('resize',()=>{if(!$('#menu').hidden){drawTableBg();refreshMenu();}if(has3D){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(!cam.user)resetCam();}});
  $('#loading').remove();$('#menu').hidden=false;refreshMenu();drawTableBg();
  requestAnimationFrame(t=>{last=t;frame(t);});
  live.connect();
  // Offline play on the published site. Skipped on file:// and on local servers, so edits show up at once.
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
}
init();

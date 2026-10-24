// Pointer input: aiming, camera orbit and pinch zoom.
"use strict";

const ptrs=new Map();let aim=null,orbit=null,pinch0=0,v3=null,ndc=null;
function tablePoint(e){
  if(G.view==='2d'){const r=c2.getBoundingClientRect();return screenToWorld(e.clientX-r.left,e.clientY-r.top);}
  const r=renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
  raycaster.setFromCamera(ndc,camera);
  return raycaster.ray.intersectPlane(plane,v3)?{x:v3.x,z:v3.z}:null;
}
function axisPoint(p,x,z){const ca=Math.cos(p.a),sa=Math.sin(p.a);const s=clamp((x-p.x)*ca+(z-p.z)*sa,-p.L/2,p.L/2);const px=p.x+ca*s,pz=p.z+sa*s;return {s,px,pz,d:Math.hypot(x-px,z-pz)};}
function onDown(e){
  ensureAudio();ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{e.target.setPointerCapture(e.pointerId);}catch(_){}
  if(ptrs.size===2){aim=null;orbit=null;G.aimVis=null;const [a,b]=[...ptrs.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);return;}
  if(G.state==='aim'&&!isCPU(G.turn)){
    const pt=tablePoint(e),p=pens[G.turn];
    const touch=e.pointerType==='touch',tol=G.view==='2d'?Math.max(.6,(touch?34:26)/T2.s):touch?.85:.6;
    if(pt){const ap=axisPoint(p,pt.x,pt.z);if(ap.d<tol){aim={s:ap.s,cx:ap.px,cz:ap.pz,power:0,dx:0,dz:0};return;}}
  }
  if(G.view==='3d')orbit={x:e.clientX,y:e.clientY,yaw:cam.yaw,pitch:cam.pitch};
}
function onMove(e){
  if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){if(G.view!=='3d')return;const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch0>0){cam.dist=clamp(cam.dist*pinch0/d,6,45);cam.user=true;}pinch0=d;return;}
  if(aim){
    const pt=tablePoint(e);if(!pt)return;
    const px=aim.cx-pt.x,pz=aim.cz-pt.z,l=Math.hypot(px,pz);
    aim.power=clamp(l/3.5,0,1);if(l>1e-3){aim.dx=px/l;aim.dz=pz/l;}
    if(aim.power>.04){G.aimVis={cx:aim.cx,cz:aim.cz,ang:Math.atan2(aim.dz,aim.dx),power:aim.power,px:pt.x,pz:pt.z};setHint(`শক্তি ${toBn(Math.round(aim.power*100))}% — ছেড়ে দিলেই টোকা`);}
    else G.aimVis=null;
  } else if(orbit){
    cam.yaw=orbit.yaw-(e.clientX-orbit.x)*.006;cam.user=true;
    cam.pitch=clamp(orbit.pitch+(e.clientY-orbit.y)*.005,.18,1.45);
  }
}
function onUp(e){
  ptrs.delete(e.pointerId);if(ptrs.size<2)pinch0=0;
  if(aim){
    G.aimVis=null;
    if(aim.power>.04&&G.state==='aim')doShot(G.turn,aim.s,aim.dx,aim.dz,aim.power);
    else setHint('আরেকটু পেছনে টেনে ছাড়ো');
    aim=null;
  }
  orbit=null;
}

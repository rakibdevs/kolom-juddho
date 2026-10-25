// First-flick tutorial: on a player's first visit, a ghost hand presses their pen and pulls back like a
// slingshot, until they make their first real flick. Remembered on the device.
"use strict";

const tutor=(()=>{
  const KEY='kolom-juddho:tutorial';
  let seen=false,on=false,v=null;
  try{seen=localStorage.getItem(KEY)==='done';}catch(e){}
  // Screen position of a world point on the table, in either view.
  function screenAt(x,z){
    if(G.view==='3d'&&has3D&&!G.glLost){
      v=v||new THREE.Vector3();v.set(x,TOP+.1,z).project(camera);
      return {x:(v.x+1)/2*innerWidth,y:(1-v.y)/2*innerHeight};
    }
    const {s,cx,cy,portrait}=T2;
    return portrait?{x:cx+z*s,y:cy-x*s}:{x:cx+x*s,y:cy+z*s};
  }
  function show(){if(seen||G.state!=='aim'||isCPU(G.turn))return;on=true;$('#tutor').hidden=false;place();}
  function hide(){on=false;$('#tutor').hidden=true;}
  // Called every frame while it shows: the hand starts on the pen and pulls away from the other pen.
  function place(){
    if(!on)return;
    if(G.state!=='aim'||isCPU(G.turn)){hide();return;}
    const p=pens[G.turn],o=pens[1-G.turn],dx=p.x-o.x,dz=p.z-o.z,l=Math.hypot(dx,dz)||1;
    const a=screenAt(p.x,p.z),b=screenAt(p.x+dx/l*1.8,p.z+dz/l*1.8),el=$('#tutor');
    el.style.transform=`translate(${a.x}px,${a.y}px)`;
    el.style.setProperty('--dx',`${b.x-a.x}px`);el.style.setProperty('--dy',`${b.y-a.y}px`);
  }
  function done(){if(seen)return;seen=true;hide();try{localStorage.setItem(KEY,'done');}catch(e){}}
  return {show,hide,place,done};
})();

// Pure 2D rigid-body physics on the table plane (x, z).
"use strict";

function newPen(def){return {def,m:def.m,L:def.L,r:def.r,I:def.m*def.L*def.L/12,grip:def.grip,speed:def.speed,x:0,z:0,a:0,vx:0,vz:0,w:0,out:false,falling:null};}
function closestSeg(p1x,p1z,q1x,q1z,p2x,p2z,q2x,q2z,o){
  const d1x=q1x-p1x,d1z=q1z-p1z,d2x=q2x-p2x,d2z=q2z-p2z,rx=p1x-p2x,rz=p1z-p2z;
  const a=d1x*d1x+d1z*d1z,e=d2x*d2x+d2z*d2z,f=d2x*rx+d2z*rz,c=d1x*rx+d1z*rz,b=d1x*d2x+d1z*d2z,den=a*e-b*b;
  let s=den>1e-9?clamp((b*f-c*e)/den,0,1):0,t=(b*s+f)/e;
  if(t<0){t=0;s=clamp(-c/a,0,1);}else if(t>1){t=1;s=clamp((b-c)/a,0,1);}
  o[0]=p1x+d1x*s;o[1]=p1z+d1z*s;o[2]=p2x+d2x*t;o[3]=p2z+d2z*t;
}
const tmp=[0,0,0,0];
function collide(A,B){
  const ca=Math.cos(A.a),sa=Math.sin(A.a),cb=Math.cos(B.a),sb=Math.sin(B.a),ha=A.L/2,hb=B.L/2;
  closestSeg(A.x-ca*ha,A.z-sa*ha,A.x+ca*ha,A.z+sa*ha,B.x-cb*hb,B.z-sb*hb,B.x+cb*hb,B.z+sb*hb,tmp);
  const dx=tmp[2]-tmp[0],dz=tmp[3]-tmp[1],d=Math.hypot(dx,dz),R=A.r+B.r;
  if(d>=R)return 0;
  let nx,nz;
  if(d<1e-6){nx=B.x-A.x;nz=B.z-A.z;const l=Math.hypot(nx,nz)||1;nx/=l;nz/=l;}else{nx=dx/d;nz=dz/d;}
  const pen=R-d,tm=A.m+B.m;
  A.x-=nx*pen*B.m/tm;A.z-=nz*pen*B.m/tm;B.x+=nx*pen*A.m/tm;B.z+=nz*pen*A.m/tm;
  const px=(tmp[0]+tmp[2])/2,pz=(tmp[1]+tmp[3])/2;
  const rAx=px-A.x,rAz=pz-A.z,rBx=px-B.x,rBz=pz-B.z;
  const vAx=A.vx-A.w*rAz,vAz=A.vz+A.w*rAx,vBx=B.vx-B.w*rBz,vBz=B.vz+B.w*rBx;
  const rvx=vBx-vAx,rvz=vBz-vAz,vn=rvx*nx+rvz*nz;
  if(vn>=0)return 0;
  const rnA=rAx*nz-rAz*nx,rnB=rBx*nz-rBz*nx;
  const j=-(1+REST)*vn/(1/A.m+1/B.m+rnA*rnA/A.I+rnB*rnB/B.I);
  A.vx-=j*nx/A.m;A.vz-=j*nz/A.m;A.w-=rnA*j/A.I;
  B.vx+=j*nx/B.m;B.vz+=j*nz/B.m;B.w+=rnB*j/B.I;
  const tx=-nz,tz=nx,vt=rvx*tx+rvz*tz,rtA=rAx*tz-rAz*tx,rtB=rBx*tz-rBz*tx;
  let jt=-vt/(1/A.m+1/B.m+rtA*rtA/A.I+rtB*rtB/B.I);jt=clamp(jt,-MU*j,MU*j);
  A.vx-=jt*tx/A.m;A.vz-=jt*tz/A.m;A.w-=rtA*jt/A.I;
  B.vx+=jt*tx/B.m;B.vz+=jt*tz/B.m;B.w+=rtB*jt/B.I;
  return j;
}
function physStep(P,dt,onHit){
  for(const p of P){
    if(p.out)continue;
    p.x+=p.vx*dt;p.z+=p.vz*dt;p.a+=p.w*dt;
    const sp=Math.hypot(p.vx,p.vz);
    if(sp>0){let ns=(sp-FRIC*p.grip*dt)*(1-LDAMP*dt);if(ns<0)ns=0;p.vx*=ns/sp;p.vz*=ns/sp;}
    let w=p.w;const dw=AFRIC*p.grip*dt;w=Math.abs(w)<=dw?0:w-Math.sign(w)*dw;p.w=clamp(w*(1-ADAMP*dt),-40,40);
  }
  for(let i=0;i<P.length;i++)for(let k=i+1;k<P.length;k++){
    if(P[i].out||P[k].out)continue;
    const j=collide(P[i],P[k]);if(j>0&&onHit)onHit(j);
  }
  for(const p of P){if(!p.out&&(Math.abs(p.x)>HX||Math.abs(p.z)>HZ))p.out=true;}
}
function atRest(P){return P.every(p=>p.out||(Math.hypot(p.vx,p.vz)<0.02&&Math.abs(p.w)<0.05));}
function applyShot(p,s,dx,dz,power){
  const J=p.m*p.speed*power,ca=Math.cos(p.a),sa=Math.sin(p.a),rx=ca*s,rz=sa*s;
  p.vx+=dx*J/p.m;p.vz+=dz*J/p.m;p.w=clamp(p.w+SPIN*(rx*dz*J-rz*dx*J)/p.I,-40,40);
}
const edgeDist=p=>Math.min(HX-Math.abs(p.x),HZ-Math.abs(p.z));

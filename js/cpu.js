// Rashed, the CPU player: tries candidate shots and scores them.
"use strict";

function simulate(me,s,ang,power){
  const P=pens.map(p=>Object.assign({},p));
  applyShot(P[me],s,Math.cos(ang),Math.sin(ang),power);
  const h=1/240;
  for(let t=0;t<6;t+=h){physStep(P,h,null);if(atRest(P))break;}
  const A=P[me],B=P[1-me];
  if(A.out)return -1000+Math.random();
  if(B.out)return 1000+edgeDist(A)*5;
  return -edgeDist(B)*10+edgeDist(A)*4;
}
function planShot(me){
  const cfg={easy:{n:12,noise:.22,pn:.25},medium:{n:45,noise:.08,pn:.12},hard:{n:150,noise:.025,pn:.05}}[level()];
  const A=pens[me],B=pens[1-me];let best=null,bs=-1e9;
  for(let i=0;i<cfg.n;i++){
    const s=(Math.random()-.5)*A.L*.9,cx=A.x+Math.cos(A.a)*s,cz=A.z+Math.sin(A.a)*s;
    const u=(Math.random()-.5)*B.L,tx=B.x+Math.cos(B.a)*u,tz=B.z+Math.sin(B.a)*u;
    const ang=Math.atan2(tz-cz,tx-cx)+(Math.random()-.5)*.5,power=.3+Math.random()*.7;
    const sc=simulate(me,s,ang,power);if(sc>bs){bs=sc;best={s,ang,power};}
  }
  best.ang+=(Math.random()-.5)*2*cfg.noise;
  best.power=clamp(best.power*(1+(Math.random()-.5)*2*cfg.pn),.15,1);
  return best;
}

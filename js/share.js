// Result card: a photo of the final table with the score, shared as a JPEG or downloaded.
"use strict";

let shotBlob=null,shotURL=null;
const CARD_W=1080,CARD_H=1350,SHOT_W=1280,SHOT_H=720;
const CARD={bg0:'#0d1813',bg1:'#1a2c22',ink:'#f6f4ec',muted:'rgba(246,244,236,.62)',glass:'rgba(255,255,255,.06)',edge:'rgba(255,255,255,.13)',gold:'#f3e58c',p:['#6d8fff','#ff6a5f']};

// Photographs the table from a fixed camera at a fixed size, so the card looks the same on every
// screen and in either view. Uses 3D when it is available, otherwise the 2D renderer.
function grabView(){
  try{
    const now=performance.now(),c=document.createElement('canvas');c.width=SHOT_W;c.height=SHOT_H;
    if(has3D&&!G.glLost){
      sync3D(now); // places the pen meshes and hides the rings and aim arrow
      const size=renderer.getSize(new THREE.Vector2()),pr=renderer.getPixelRatio(),pc=camera.clone();
      pc.fov=38;pc.aspect=SHOT_W/SHOT_H;pc.updateProjectionMatrix();
      fitDist(pc,.35,.8,{x:.95,top:.9,bottom:-.8});
      renderer.setPixelRatio(1);renderer.setSize(SHOT_W,SHOT_H,false);renderer.render(scene,pc);
      c.getContext('2d').drawImage(renderer.domElement,0,0);
      renderer.setPixelRatio(pr);renderer.setSize(size.x,size.y,false);
    } else {draw2D(now,SHOT_W,SHOT_H,true);c.getContext('2d').drawImage(c2,0,0,SHOT_W,SHOT_H);}
    return c;
  }catch(e){return null;}
}
const shareURL=()=>location.protocol.startsWith('http')?location.host+location.pathname.replace(/index\.html$/,'').replace(/\/$/,''):'';

// Shrinks the font until txt fits in max pixels.
function fitFont(g,txt,max,weight,size,family){for(;;){g.font=`${weight} ${size}px ${family}`;if(g.measureText(txt).width<=max||size<=14)return size;size-=2;}}
function pill(g,x,y,w,h,fill,stroke){rr(g,x,y,w,h,h/2);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=2;g.stroke();}}

function drawResultCard(view,w){
  const c=document.createElement('canvas');c.width=CARD_W;c.height=CARD_H;
  const g=c.getContext('2d'),W=CARD_W,H=CARD_H,mid=W/2;
  g.textBaseline='alphabetic';
  // background: deep board green with a glow in the winner's colour
  const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,CARD.bg0);bg.addColorStop(1,CARD.bg1);g.fillStyle=bg;g.fillRect(0,0,W,H);
  const glow=(x,y,r,col,a)=>{const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.globalAlpha=a;g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);g.globalAlpha=1;};
  glow(mid,330,640,CARD.p[w],.3);glow(mid,1250,520,CARD.gold,.08);
  for(let i=0;i<260;i++){g.fillStyle=`rgba(255,255,255,${.02+(i%5)*.006})`;g.fillRect((i*389)%W,(i*571)%H,2,2);}

  // header: icon, name and date
  rr(g,60,52,84,84,22);g.fillStyle='#22342b';g.fill();g.strokeStyle='#6a4024';g.lineWidth=6;g.stroke();
  g.save();g.translate(102,94);g.rotate(-.6);g.scale(44,44);drawPen2D(g,{def:pens[0].def,x:0,z:0,a:0});g.restore();
  g.textAlign='left';g.fillStyle=CARD.ink;g.font=`700 50px ${FONT_CHALK}`;g.fillText('কলম যুদ্ধ',166,100);
  g.fillStyle=CARD.muted;g.font='400 24px Kalam, cursive';g.fillText('Pen fight on Sir’s table',168,132);
  const date=`${todayBn()} · ${weekdayBn()}`;g.font=`600 24px ${FONT_UI}`;const dw=g.measureText(date).width+40;
  pill(g,1020-dw,70,dw,50,CARD.glass,CARD.edge);g.fillStyle=CARD.ink;g.textAlign='center';g.fillText(date,1020-dw/2,103);

  // headline
  g.fillStyle=CARD.gold;g.font=`600 28px ${FONT_UI}`;g.fillText('ম্যাচের ফলাফল',mid,232);
  const title=$('#endTitle').textContent;fitFont(g,title,940,700,92,FONT_CHALK);
  g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=24;g.fillStyle=CARD.ink;g.fillText(title,mid,334);g.shadowColor='transparent';

  // scoreboard
  rr(g,60,376,960,248,34);g.fillStyle=CARD.glass;g.fill();g.strokeStyle=CARD.edge;g.lineWidth=2;g.stroke();
  g.font=`700 118px ${FONT_UI}`;
  [0,1].forEach(i=>{g.textAlign=i?'left':'right';g.fillStyle=i===w?CARD.gold:'rgba(246,244,236,.5)';g.fillText(toBn(G.score[i]),mid+(i?44:-44),546);});
  g.textAlign='center';g.fillStyle=CARD.muted;g.font=`500 64px ${FONT_UI}`;g.fillText('–',mid,530);
  [0,1].forEach(i=>{
    const cx=i?836:244,d=pens[i].def;
    if(i===w){g.font=`700 22px ${FONT_UI}`;const bw=g.measureText('বিজয়ী').width+34;pill(g,cx-bw/2,400,bw,38,CARD.gold);g.fillStyle='#1a1a12';g.fillText('বিজয়ী',cx,427);}
    g.fillStyle=CARD.ink;fitFont(g,who(i),300,700,36,FONT_UI);g.fillText(who(i),cx,480);
    g.fillStyle=CARD.p[i];rr(g,cx-22,494,44,5,2.5);g.fill();
    g.save();g.translate(cx,540);g.scale(116,116);drawPen2D(g,{def:d,x:0,z:0,a:0});g.restore();
    g.fillStyle=CARD.muted;fitFont(g,`${d.name} · ${d.colorBn}`,300,500,22,FONT_UI);g.fillText(`${d.name} · ${d.colorBn}`,cx,600);
  });

  // photo of the final table
  const px=60,py=656,pw=960,ph=540;
  g.save();g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=40;g.shadowOffsetY=16;rr(g,px,py,pw,ph,30);g.fillStyle='#2a2a26';g.fill();g.restore();
  if(view){g.save();rr(g,px,py,pw,ph,30);g.clip();const k=Math.max(pw/view.width,ph/view.height),vw=view.width*k,vh=view.height*k;g.drawImage(view,px+(pw-vw)/2,py+(ph-vh)/2,vw,vh);
    const fade=g.createLinearGradient(0,py,0,py+120);fade.addColorStop(0,'rgba(0,0,0,.35)');fade.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=fade;g.fillRect(px,py,pw,120);g.restore();}
  rr(g,px,py,pw,ph,30);g.strokeStyle=CARD.edge;g.lineWidth=2;g.stroke();
  g.font=`600 22px ${FONT_UI}`;const tw=g.measureText('শেষ মুহূর্ত').width+32;pill(g,px+22,py+22,tw,42,'rgba(10,16,13,.62)','rgba(255,255,255,.18)');
  g.fillStyle=CARD.ink;g.textAlign='center';g.fillText('শেষ মুহূর্ত',px+22+tw/2,py+50);

  // call to action
  const url=shareURL(),cta='তুমিও খেলো',tail=url||'টিফিন পিরিয়ডের কলম যুদ্ধ';
  g.font=`700 28px ${FONT_UI}`;const cw=g.measureText(cta).width;g.font=`500 26px ${FONT_UI}`;const uw=g.measureText(tail).width;
  const total=cw+24+uw+56;pill(g,mid-total/2,1238,total,66,CARD.glass,CARD.edge);
  g.textAlign='left';g.fillStyle=CARD.gold;g.font=`700 28px ${FONT_UI}`;g.fillText(cta,mid-total/2+28,1281);
  g.fillStyle=CARD.ink;g.font=`500 26px ${FONT_UI}`;g.fillText(tail,mid-total/2+28+cw+24,1281);
  return c;
}

// Called by matchOver with the winner. Takes the photo now, then builds the card once fonts are ready.
async function prepareShare(w){
  const view=grabView(),btn=$('#bShare'),img=$('#shotPreview');
  shotBlob=null;btn.disabled=true;btn.textContent='📸 ছবি শেয়ার করো';img.hidden=true;
  try{await Promise.race([Promise.all([document.fonts.load('400 24px Kalam'),document.fonts.load('700 92px Atma','তুমি'),document.fonts.load(`700 36px ${FONT_UI}`,'তুমি'),document.fonts.load(`500 22px ${FONT_UI}`,'তুমি')]),new Promise(r=>setTimeout(r,1500))]);}catch(e){}
  const card=drawResultCard(view,w);
  card.toBlob(b=>{
    if(!b)return;shotBlob=b;btn.disabled=false;
    if(shotURL)URL.revokeObjectURL(shotURL);shotURL=URL.createObjectURL(b);img.src=shotURL;img.hidden=false;
  },'image/jpeg',.9);
}

// Shares only the image: with text attached, iOS targets such as WhatsApp drop the image.
// The link is printed on the card. Browsers that cannot share files download it instead.
async function shareResult(){
  if(!shotBlob)return;
  const file=new File([shotBlob],'kolom-juddho.jpg',{type:'image/jpeg'});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file]});return;}}
  catch(e){if(e.name==='AbortError')return;}
  const a=document.createElement('a');a.href=shotURL;a.download='kolom-juddho.jpg';document.body.appendChild(a);a.click();a.remove();
  $('#bShare').textContent='✓ ছবি ডাউনলোড হয়েছে';
}

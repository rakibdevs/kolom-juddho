// Result card: the last frame of the match on Sir's table, shared as a PNG or downloaded.
"use strict";

let shotBlob=null,shotURL=null;
const CARD_W=1080,CARD_H=1350;

// Copies the current game view. Must run in the same task as the render, before WebGL clears its buffer.
function grabView(){
  try{
    const now=performance.now();let src;
    if(G.view==='3d'&&has3D){sync3D(now);src=renderer.domElement;}else{draw2D(now);src=c2;}
    const c=document.createElement('canvas');c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);return c;
  }catch(e){return null;}
}
const shareURL=()=>location.protocol.startsWith('http')?location.host+location.pathname.replace(/index\.html$/,''):'';

function drawResultCard(view,title,score){
  const c=document.createElement('canvas');c.width=CARD_W;c.height=CARD_H;
  const g=c.getContext('2d'),W=CARD_W,H=CARD_H,font=(w,px,f)=>`${w} ${px}px ${f||FONT_UI}`;
  drawTableTop(g,W,H);
  const sh=g.createRadialGradient(W/2,H*.45,W*.2,W/2,H*.45,W*.9);sh.addColorStop(0,'rgba(20,10,4,.25)');sh.addColorStop(1,'rgba(20,10,4,.7)');
  g.fillStyle=sh;g.fillRect(0,0,W,H);
  // chalkboard header
  g.fillStyle='rgba(0,0,0,.35)';rr(g,66,72,948,370,10);g.fill();
  g.fillStyle='#6a4024';rr(g,60,60,960,370,10);g.fill();
  g.fillStyle='#22342b';g.fillRect(78,78,924,334);
  for(let i=0;i<30;i++){const x=90+(i*197)%900,y=90+(i*89)%310,r=60+(i*37)%90,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.04)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);}
  g.textBaseline='alphabetic';g.textAlign='left';g.fillStyle='#f4f2ea';
  g.font=font(700,104,FONT_CHALK);g.fillText('কলম যুদ্ধ',112,198);
  g.font=font(400,38,'Kalam, cursive');g.globalAlpha=.9;g.fillText('Pen fight on Sir’s table',116,250);g.globalAlpha=1;
  g.textAlign='right';g.font=font(500,30,FONT_CHALK);g.globalAlpha=.75;g.fillText(`তারিখ: ${todayBn()}, ${weekdayBn()}`,970,122);g.globalAlpha=1;
  g.textAlign='left';g.fillStyle='#f3e58c';g.font=font(700,62,FONT_CHALK);g.fillText(title,112,340,840);
  g.fillStyle='#f4f2ea';g.font=font(600,40,FONT_CHALK);g.fillText(score,112,392);
  // the last frame, as a photo pinned to the table
  const px=96,py=486,pw=888,ph=600,pad=20;
  g.save();g.translate(W/2,py+ph/2);g.rotate(-.015);g.translate(-W/2,-(py+ph/2));
  g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=30;g.shadowOffsetY=12;g.fillStyle='#fbf8ef';g.fillRect(px,py,pw,ph);g.shadowColor='transparent';
  const bx=px+pad,by=py+pad,bw=pw-2*pad,bh=ph-2*pad;
  g.fillStyle='#2a2a26';g.fillRect(bx,by,bw,bh);
  if(view){const k=Math.max(bw/view.width,bh/view.height),dw=view.width*k,dh=view.height*k;g.save();g.beginPath();g.rect(bx,by,bw,bh);g.clip();g.drawImage(view,bx+(bw-dw)/2,by+(bh-dh)/2,dw,dh);g.restore();}
  g.restore();
  // players and their pens
  [0,1].forEach(i=>{
    const x=i?W/2+12:60,y=1126,w=W/2-72,h=150,d=pens[i].def,col=i?'#c8302b':'#2348b5';
    g.fillStyle='rgba(255,253,247,.95)';rr(g,x,y,w,h,14);g.fill();
    g.fillStyle=col;g.fillRect(i?x+w-10:x,y,10,h);
    g.textAlign=i?'right':'left';const tx=i?x+w-30:x+30;
    g.fillStyle='#1c2541';g.font=font(700,36);g.fillText(`${who(i)} · ${toBn(G.score[i])}`,tx,y+50,w-60);
    g.fillStyle='#4a5372';g.font=font(500,26);g.fillText(`${d.name} · ${d.colorBn}`,tx,y+88,w-60);
    g.save();g.translate(x+w/2,y+122);g.scale(130,130);drawPen2D(g,{def:d,x:0,z:0,a:0});g.restore();
  });
  g.textAlign='center';g.fillStyle='rgba(255,255,255,.85)';g.font=font(600,28);
  g.fillText(['টিফিন পিরিয়ডের কলম যুদ্ধ',shareURL()].filter(Boolean).join(' · '),W/2,H-26);
  return c;
}

// Called by matchOver. Grabs the frame now, then builds the card once the fonts are ready.
async function prepareShare(title,score){
  const view=grabView(),btn=$('#bShare'),img=$('#shotPreview');
  shotBlob=null;btn.disabled=true;btn.textContent='📸 ছবি শেয়ার করো';img.hidden=true;
  try{await Promise.race([Promise.all([document.fonts.load('400 38px Kalam'),document.fonts.load('700 62px Atma','তুমি'),document.fonts.load('700 36px "Anek Bangla"','তুমি')]),new Promise(r=>setTimeout(r,1500))]);}catch(e){}
  const card=drawResultCard(view,title,score);
  card.toBlob(b=>{
    if(!b)return;shotBlob=b;btn.disabled=false;
    if(shotURL)URL.revokeObjectURL(shotURL);shotURL=URL.createObjectURL(b);img.src=shotURL;img.hidden=false;
  },'image/png');
}

// Uses the share sheet when the browser can share files, otherwise downloads the PNG.
async function shareResult(){
  if(!shotBlob)return;
  const file=new File([shotBlob],'kolom-juddho.png',{type:'image/png'}),url=shareURL();
  const text=`${$('#endTitle').textContent} ${$('#endScore').textContent} — কলম যুদ্ধ`+(url?` https://${url}`:'');
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'কলম যুদ্ধ',text});return;}}
  catch(e){if(e.name==='AbortError')return;}
  const a=document.createElement('a');a.href=shotURL;a.download='kolom-juddho.png';document.body.appendChild(a);a.click();a.remove();
  $('#bShare').textContent='✓ ছবি ডাউনলোড হয়েছে';
}

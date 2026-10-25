// Web Audio sounds made in code (no audio files): flicks, hits, falls and the bell, plus haptics.
"use strict";

let actx=null,noiseBuf=null;
function ensureAudio(){
  if(!actx){try{actx=new(window.AudioContext||window.webkitAudioContext)();const n=actx.sampleRate*.3;noiseBuf=actx.createBuffer(1,n,actx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;}catch(e){actx=null;}}
  if(actx&&actx.state==='suspended')actx.resume();
}
function snap(vol,freq,dur,tone){
  if(muted||!actx)return;
  const t=actx.currentTime,src=actx.createBufferSource();src.buffer=noiseBuf;
  const f=actx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=2.5;
  const g=actx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  src.connect(f);f.connect(g);g.connect(actx.destination);src.start(t);src.stop(t+dur+.02);
  if(tone){const o=actx.createOscillator(),og=actx.createGain();o.type='triangle';o.frequency.setValueAtTime(tone,t);o.frequency.exponentialRampToValueAtTime(tone*.6,t+.06);og.gain.setValueAtTime(vol*.35,t);og.gain.exponentialRampToValueAtTime(.0001,t+.08);o.connect(og);og.connect(actx.destination);o.start(t);o.stop(t+.1);}
}
let lastHit=0;
function hitSound(j){const now=performance.now();if(now-lastHit<45)return;lastHit=now;snap(clamp(j/8,.12,.9),3400,.05,1900);if(j>2.5)buzz(Math.round(clamp(j*4,15,40)));}

// The brass hand-bell: each strike is a few inharmonic partials with a slow decay. A short ring opens a
// match (tiffin starts), a long one closes it.
function bell(long){
  if(muted||!actx)return;
  const t0=actx.currentTime+.05,n=long?9:3;
  for(let k=0;k<n;k++){
    const t=t0+k*.17+Math.random()*.03,v=.16*(1-k/(n+2));
    [[1,1],[2.76,.5],[5.4,.28],[8.93,.12]].forEach(([r,a])=>{
      const o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.value=1180*r*(1+(Math.random()-.5)*.004);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*a,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+(long?1.6:1.1)/Math.sqrt(r));
      o.connect(g);g.connect(actx.destination);o.start(t);o.stop(t+1.7);
    });
  }
}

// Haptics on phones that support them; silent when sound is off.
function buzz(p){if(!muted&&navigator.vibrate)try{navigator.vibrate(p);}catch(e){}}

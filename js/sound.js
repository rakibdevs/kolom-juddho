// Web Audio noise bursts, no audio files.
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
function hitSound(j){const now=performance.now();if(now-lastHit<45)return;lastHit=now;snap(clamp(j/8,.12,.9),3400,.05,1900);}

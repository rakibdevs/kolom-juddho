// Service worker: after one visit the game opens with no network. The game files, the pinned three.js
// build and the Google Fonts are served from a cache and refreshed in the background. The Pages
// workflow stamps VERSION with the build date, so every deploy installs fresh files and drops old caches.
"use strict";

const VERSION='__BUILD_DATE__',CACHE=`kolom-juddho-${VERSION}`;
const CORE=['./','index.html','css/style.css','manifest.webmanifest','assets/icon.svg','assets/icon-192.png',
  ...['config','physics','cpu','sound','art','scene3d','render2d','flow','tutorial','menu','share','challenge','input','main'].map(f=>`js/${f}.js`),
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'];
// Other hosts whose files are worth keeping offline.
const HOSTS=['cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('kolom-juddho-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
// Stale-while-revalidate: answer from the cache at once, fetch a fresh copy for next time.
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=='GET')return;
  const own=url.origin===self.location.origin;
  if(!own&&!HOSTS.includes(url.hostname))return;
  e.respondWith(caches.open(CACHE).then(async c=>{
    const key=req.mode==='navigate'?'index.html':req;
    const hit=await c.match(key,{ignoreSearch:req.mode==='navigate'});
    const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(key,r.clone());return r;}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit;}
    return (await net)||Response.error();
  }));
});

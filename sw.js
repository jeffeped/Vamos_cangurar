const VERSION='0.2.0-demo.1';
const PREFIX='vamos-cangurar-demo-'+self.registration.scope;
const CACHE=PREFIX+VERSION;
const ASSETS=['./','./index.html','./app.js','./manifest.json','./icon-192.png','./icon-512.png','./CHANGELOG.md','./version.json'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(()=>caches.match(new URL('./index.html',self.registration.scope).href)));
  return;
 }
 event.respondWith(caches.open(CACHE).then(async cache=>{
  const hit=await cache.match(request);
  if(hit)return hit;
  return fetch(request);
 }));
});


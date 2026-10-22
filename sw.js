const VERSION='0.2.0-demo.4';
const PREFIX='vamos-cangurar-demo-'+self.registration.scope;
const CACHE=PREFIX+VERSION;
const ASSETS=['./','./index.html','./app.js','./manifest.json','./icon-192.png','./icon-512.png','./CHANGELOG.md','./version.json','./images/GRV-019_r01_contato_pele_a_pele.png','./images/GRV-001_r01_contato_pele_a_pele.png','./images/GRV-022_r01_conhecer_a_faixa.png','./images/GRV-026_r01_mae_comendo_fruta.png','./images/GRV-025_r01_pele_a_pele_com_pai.png','./images/GRV-024_r01_canguru_no_hospital.png'];
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


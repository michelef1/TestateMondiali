const CACHE='testatemondiali-v15';
const CACHE_IMG='testatemondiali-img-v15';
const SHELL=[
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
const NO_CACHE_HOSTS=['api.rss2json.com','api.allorigins.win','www.google.com','api.mymemory.translated.net'];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE&&k!==CACHE_IMG).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);

  // Screenshot homepage: prima la rete (così non resta una schermata di attesa),
  // la copia salvata serve solo se sei offline
  if(u.hostname==='s.wordpress.com'){
    e.respondWith(
      fetch(r).then(res=>{
        if(res&&(res.ok||res.type==='opaque')){
          const cp=res.clone();
          caches.open(CACHE_IMG).then(c=>c.put(r,cp));
        }
        return res;
      }).catch(()=>caches.match(r).then(h=>h||Response.error()))
    );
    return;
  }

  // Non cachare API/proxy/favicon esterni
  if(NO_CACHE_HOSTS.includes(u.hostname))return;

  e.respondWith(
    caches.match(r,{ignoreSearch:false}).then(hit=>{
      const net=fetch(r).then(res=>{
        if(res&&(res.ok||res.type==='opaque')){
          const cp=res.clone();
          caches.open(CACHE).then(c=>c.put(r,cp));
        }
        return res;
      }).catch(()=>hit||caches.match('./index.html'));
      return hit||net;
    })
  );
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.openWindow('./'));
});
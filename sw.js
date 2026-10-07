const CACHE='testatemondiali-v12';
const CACHE_IMG='testatemondiali-img-v12';
const IMG_TTL=24*60*60*1000; // 24h
const SHELL=[
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
const NO_CACHE_HOSTS=['api.rss2json.com','api.allorigins.win','s.wordpress.com','www.google.com'];

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

async function imgFromCache(req){
  const cache=await caches.open(CACHE_IMG);
  const hit=await cache.match(req);
  if(!hit)return null;
  const ts=+(hit.headers.get('x-cached-at')||0);
  if(Date.now()-ts>IMG_TTL){cache.delete(req);return null}
  return hit;
}

async function imgToCache(req,res){
  const cache=await caches.open(CACHE_IMG);
  const cp=res.clone();
  const h=new Headers(cp.headers);
  h.set('x-cached-at',Date.now().toString());
  const body=await cp.blob();
  await cache.put(req,new Response(body,{status:cp.status,statusText:cp.statusText,headers:h}));
}

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);

  // Non cachare API/proxy/favicon esterni
  if(NO_CACHE_HOSTS.includes(u.hostname)){
    // Per le immagini di anteprima usa cache dedicata con TTL
    if(u.hostname==='s.wordpress.com'||/\.(jpe?g|png|webp|gif|svg)$/i.test(u.pathname)){
      e.respondWith(
        imgFromCache(r).then(hit=>{
          const net=fetch(r).then(res=>{
            if(res&&(res.ok||res.type==='opaque'))imgToCache(r,res.clone());
            return res;
          }).catch(()=>hit);
          return hit||net;
        })
      );
      return;
    }
    return;
  }

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
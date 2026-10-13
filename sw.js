const CACHE='testatemondiali-v21';
const CACHE_IMG='testatemondiali-img-v21';
const PREFIX='testatemondiali-';
const SHELL=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
const NO_CACHE_HOSTS=['api.rss2json.com','api.allorigins.win','www.google.com','api.mymemory.translated.net'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    // La shell è importante, ma un'icona mancante non deve impedire l'aggiornamento.
    await Promise.all(SHELL.map(async url=>{try{const response=await fetch(url,{cache:'reload'});if(response.ok)await cache.put(url,response)}catch(_){}}));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE&&key!==CACHE_IMG).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  let url;try{url=new URL(request.url)}catch(_){return}
  if(NO_CACHE_HOSTS.includes(url.hostname))return;

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request);
        if(response&&response.ok){const cache=await caches.open(CACHE);await cache.put('./index.html',response.clone()).catch(()=>{});}
        return response;
      }catch(_){return (await caches.match(request))||(await caches.match('./index.html'))||new Response('Sei offline e la pagina non è ancora disponibile in cache.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}
    })());
    return;
  }

  if(url.hostname==='s.wordpress.com'){
    event.respondWith((async()=>{
      try{const response=await fetch(request);if(response&&(response.ok||response.type==='opaque'))caches.open(CACHE_IMG).then(c=>c.put(request,response.clone())).catch(()=>{});return response}
      catch(_){return (await caches.match(request))||Response.error()}
    })());
    return;
  }

  if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(request);
    if(cached)return cached;
    try{const response=await fetch(request);if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});return response}
    catch(_){return request.destination==='document'?(await cache.match('./index.html'))||Response.error():Response.error()}
  })());
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
    for(const client of windows){if('focus' in client)return client.focus()}
    return clients.openWindow('./');
  }));
});

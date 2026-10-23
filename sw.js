const CACHE_NAME = 'fisa-atelier-v355';
const AUTH_SCRIPTS=['firebase-app-compat.js','firebase-auth-compat.js','firebase-firestore-compat.js'].map(name=>'https://www.gstatic.com/firebasejs/10.14.1/'+name);
const APP_FILES = [
  './',
  './index.html',
  './app-safe-area.css?v=1.26.7',
  './workspace-polish.css?v=1.26.7',
  './project-editor.css?v=1.27.1',
  './sw.js?v=1.27.1',
  './notes/notes-editor.css?v=1.26.13',
  './notes/notes-editor.js?v=1.27.0',
  './inventory/inventory.css?v=1.24.10',
  './inventory/inventory.js?v=1.26.14',
  './models/viewer.css?v=1.27.0',
  './models/viewer.js?v=1.27.0',
  './models/sticky.js?v=1.26.4',
  './models/geometry.js?v=1.26.7',
  './models/vendor/skp-worker.js?v=1.26.7',
  './models/vendor/three.module.js',
  './models/vendor/three.core.min.js',
  './models/vendor/OrbitControls.js?v=1.26.7',
  './models/vendor/GLTFLoader.js',
  './models/vendor/BufferGeometryUtils.js',
  './pdfjs-6.3.289.min.mjs',
  './pdfjs-worker-6.3.289.min.mjs',
  './notes/pdf-lib.min.js',
  './manifest.webmanifest',
  './icon-180.png?v=1.23.0',
  './icon-192.png?v=1.23.0',
  './icon-512.png?v=1.23.0',...AUTH_SCRIPTS
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for(let offset=0;offset<APP_FILES.length;offset+=2)await Promise.all(APP_FILES.slice(offset,offset+2).map(async (file) => {
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
      try {
        const response = await fetch(file, { cache: 'reload',signal:controller.signal });
        if (response.ok) await cache.put(file, response);
      } catch {}finally{clearTimeout(timer);}
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const previous=keys.filter(key=>key.startsWith('fisa-atelier-v')&&key!==CACHE_NAME).sort((a,b)=>Number(b.split('-v').pop())-Number(a.split('-v').pop()));
    await Promise.all(previous.slice(1).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin && !AUTH_SCRIPTS.includes(url.href)) return;

  event.respondWith((async () => {
    const asset=event.request.mode!=='navigate'&&['script','style','font','image','worker'].includes(event.request.destination);
    let cache,cached;
    try{
      cache=await caches.open(CACHE_NAME);cached=await cache.match(event.request);
      if(asset&&!cached){const previous=(await caches.keys()).filter(key=>key.startsWith('fisa-atelier-v')&&key!==CACHE_NAME);for(const key of previous){cached=await(await caches.open(key)).match(event.request);if(cached)break;}}
    }catch{}
    if((asset||AUTH_SCRIPTS.includes(url.href))&&cached)return cached;
    try{
      const response=await fetch(event.request);
      if(response.ok){try{await cache?.put(event.request,response.clone());}catch{}return response;}
      if(cached)return cached;return response;
    }catch{
      if(cached)return cached;
      if(event.request.mode==='navigate'){let fallback;try{fallback=await cache?.match('./index.html');}catch{}return fallback||new Response('<h1>Offline</h1>',{headers:{'Content-Type':'text/html; charset=utf-8'},status:503});}
      return Response.error();
    }
  })());
});

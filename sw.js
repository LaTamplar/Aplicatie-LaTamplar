const CACHE_NAME = 'fisa-atelier-v315';
const APP_FILES = [
  './',
  './index.html',
  './sw.js?v=1.24.4',
  './notes/notes-editor.css?v=1.24.4',
  './notes/notes-editor.js?v=1.24.4',
  './inventory/inventory.css?v=1.24.4',
  './inventory/inventory.js?v=1.24.4',
  './pdfjs-6.3.289.min.mjs',
  './pdfjs-worker-6.3.289.min.mjs',
  './notes/pdf-lib.min.js',
  './manifest.webmanifest',
  './icon-180.png?v=1.23.0',
  './icon-192.png?v=1.23.0',
  './icon-512.png?v=1.23.0'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_FILES.map(async (file) => {
      try {
        const response = await fetch(file, { cache: 'reload' });
        if (response.ok) await cache.put(file, response);
      } catch {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(event.request, { cache: 'no-store' });
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        return (await cache.match('./index.html')) || new Response('<h1>Offline</h1>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          status: 503
        });
      }
      return Response.error();
    }
  })());
});

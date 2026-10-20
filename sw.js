// Network first: use the latest game files, then keep a copy for offline reloads.
const SWCACHE = 'harrys-chess-v2';
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const response = fetch(event.request, {cache:'reload'}).then(fresh => {
    if (!fresh.ok) return fresh;
    return caches.open(SWCACHE)
      .then(cache => cache.put(event.request, fresh.clone()))
      .then(() => fresh, () => fresh);
  }).catch(() => caches.match(event.request).then(cached => cached || Response.error()));
  event.respondWith(response);
});

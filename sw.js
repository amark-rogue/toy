self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((all) => {
    return Promise.all(all.map((k) => caches.delete(k)));
  }).then(() => self.clients.claim()).then(() => {
    return self.clients.matchAll({type: 'window'});
  }).then((all) => {
    // pages loaded from a stale cache heal themselves: one reload, now through this SW
    all.forEach((c) => { if(c.navigate){ c.navigate(c.url) } });
  }));
});

self.addEventListener('fetch', (e) => {
  // pass-through: the server stamps assets with ?v=<mtime> and serves HTML no-cache,
  // so a changed file always gets a fresh URL — browser caching of stamped URLs is safe and fast
  e.respondWith(fetch(e.request));
});

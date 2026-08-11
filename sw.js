self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((all) => {
    return Promise.all(all.map((k) => 'opfs' === k ? 1 : caches.delete(k)));
  }).then(() => self.clients.claim()).then(() => {
    return self.clients.matchAll({type: 'window'});
  }).then((all) => {
    // pages loaded from a stale cache heal themselves: one reload, now through this SW
    all.forEach((c) => { if(c.navigate){ c.navigate(c.url) } });
  }));
});

var opfs = async function(e, u, key){
  var hit = await caches.match(u.href, {ignoreSearch: true}) || await caches.match(e.request, {ignoreSearch: true});
  if(hit) return hit;
  var path = u.pathname.slice(key.length).split('/').filter(Boolean);
  var root = await navigator.storage.getDirectory();
  var dir = root;
  var i;
  try{
    for(i = 0; i < path.length - 1; i += 1){
      dir = await dir.getDirectoryHandle(decodeURIComponent(path[i]));
    }
    var name = decodeURIComponent(path[path.length - 1] || 'index.html');
    var file;
    try{
      file = await (await dir.getFileHandle(name)).getFile();
    }catch(err){
      dir = await dir.getDirectoryHandle(name);
      file = await (await dir.getFileHandle('index.html')).getFile();
    }
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    var mime = {
      css: 'text/css', html: 'text/html', htm: 'text/html', js: 'text/javascript',
      json: 'application/json', svg: 'image/svg+xml', png: 'image/png',
      jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
      ico: 'image/x-icon', txt: 'text/plain', xml: 'application/xml',
      wasm: 'application/wasm', mp3: 'audio/mpeg', mp4: 'video/mp4',
      webm: 'video/webm', woff: 'font/woff', woff2: 'font/woff2', md: 'text/markdown'
    };
    return new Response(file, {headers: {'Content-Type': file.type || mime[ext] || 'application/octet-stream'}});
  }catch(err){
    return new Response('OPFS: ' + (err.message || err), {
      status: 404,
      headers: {'Content-Type': 'text/plain', 'X-OPFS': 'miss'}
    });
  }
};

self.addEventListener('fetch', (e) => {
  var u = new URL(e.request.url);
  if(u.origin !== location.origin || e.request.method !== 'GET'){ return }
  var at = u.pathname.indexOf('/opfs/');
  if(at !== -1){
    var key = u.pathname.slice(0, at) + '/opfs/';
    e.respondWith(opfs(e, u, key));
    return;
  }
  // bust every cache layer (browser + CDN edge); the server ignores the query
  u.searchParams.set('t', Date.now());
  e.respondWith(fetch(new Request(u, {cache: 'no-store'})).catch(() => fetch(e.request)));
});


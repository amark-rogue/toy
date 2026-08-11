// AUTHOR CREDIT: @abenezermario

VM.srv = {};
VM.srv.ports = {};
VM.srv.pending = {};

VM.srv.mime = {
  css: 'text/css', html: 'text/html', htm: 'text/html', js: 'text/javascript',
  json: 'application/json', svg: 'image/svg+xml', png: 'image/png',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  ico: 'image/x-icon', txt: 'text/plain', xml: 'application/xml',
  wasm: 'application/wasm', mp3: 'audio/mpeg', mp4: 'video/mp4',
  webm: 'video/webm', woff: 'font/woff', woff2: 'font/woff2'
};

VM.srv.url = function(path){
  var part = path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return new URL('/opfs/' + part, location.origin).href;
};

VM.srv.save = async function(path, bag){
  var list = await demo.opfs.list(path);
  var i, at, buf, ext, type;
  for(i = 0; i < list.length; i += 1){
    at = path.replace(/\/$/, '') + '/' + list[i].name;
    if('directory' === list[i].kind){
      await VM.srv.save(at, bag);
      continue;
    }
    buf = await demo.opfs.read(at);
    ext = (list[i].name.split('.').pop() || '').toLowerCase();
    type = VM.srv.mime[ext] || 'application/octet-stream';
    await bag.put(VM.srv.url(at), new Response(buf, {headers: {'Content-Type': type}}));
  }
};

VM.srv.disk = async function(path){
  if(!window.caches) return;
  var bag = await caches.open('opfs');
  var root = demo.path.up(path);
  var base = VM.srv.url(root).replace(/\/$/, '') + '/';
  var keys = await bag.keys();
  var i;
  for(i = 0; i < keys.length; i += 1){
    if(0 === keys[i].url.indexOf(base)) await bag.delete(keys[i]);
  }
  await VM.srv.save(root, bag);
};

VM.srv.patterns = [
  /listening on (?:port )?(\d+)/i,
  /server (?:running|started) (?:on|at) .*?:(\d+)/i,
  /http:\/\/(?:localhost|0\.0\.0\.0|127\.0\.0\.1):(\d+)/i,
];

VM.srv.scan = function (out) {
  for (var i = 0; i < VM.srv.patterns.length; i++) {
    var m = out.match(VM.srv.patterns[i]);
    if (m && m[1]) {
      var port = m[1];
      if (VM.srv.ports[port]) return;
      VM.srv.ports[port] = { at: Date.now() };
      kit.say({ name: "port:" + port, prompt: "open " + port }, "belt");
      kit.say("Server on port " + port, "help");
    }
  }
};

VM.srv.fetch = function (port, path) {
  if (!VM.emu || !VM.ready) return Promise.resolve("VM not ready");
  var id = Math.random().toString(36).slice(2, 8);
  var cmd =
    "echo ===H" +
    id +
    "=== && nc -w 2 127.0.0.1 " +
    port +
    "; echo; echo ===E" +
    id +
    "===\n";
  VM.emu.serial0_send(cmd);
  return new Promise((ok) => {
    VM.srv.pending[id] = ok;
    setTimeout(() => {
      if (VM.srv.pending[id]) {
        delete VM.srv.pending[id];
        ok("timeout: no response from port " + port);
      }
    }, 10000);
  });
};

if(VM.cmd && VM.cmd.routes){
  VM.cmd.routes.push({
    match: /^open(?:\s+|$)/i,
    run: function(cmd, emu){
      if(emu && emu.serial0_send) emu.serial0_send('\n');
      return true;
    }
  });
}

// bridge: open.html requests → VM serial proxy
kit.ear('fetch',(eve)=>{
  var d = eve.detail||eve.data;
  if(!d) return;
  if(d.file){
    if(window.demo && demo.opfs && !demo.opfs.root){
      demo.opfs.init().catch(function(){});
    }
    var path = (window.demo && demo.path) ? demo.path.abs(d.file) : d.file;
    if(!path || '/' !== path.charAt(0)) path = '/' + path;
    if(!window.demo || !demo.opfs || !demo.opfs.exists){
      kit.say({ id: d.id, err: path + ': OPFS not available' }, 'open');
      return;
    }
    demo.opfs.exists(path).then(async function(hit){
      if(!hit || 'file' !== hit.kind){
        kit.say({ id: d.id, err: path + ': No such file' }, 'open');
        return;
      }
      var text = '';
      try{
        var buf = await demo.opfs.read(path);
        text = new TextDecoder('utf-8').decode(buf);
      }catch(e){}
      try{
        await VM.srv.disk(path);
      }catch(err){
        if(!text){
          kit.say({ id: d.id, err: 'open: ' + (err.message || err) }, 'open');
          return;
        }
      }
      kit.say({ id: d.id, file: path, url: VM.srv.url(path), html: text }, 'open');
    });
    return;
  }
  if(!d.port) return;
  VM.srv.fetch(d.port, d.path).then((html) => {
    kit.say({ id: d.id, html: html }, 'open');
  });
});


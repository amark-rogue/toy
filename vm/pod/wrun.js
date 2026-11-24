// Lifo guest realm: runs inside a module Worker (or Node worker_threads in tests).
// Page loads this file, then boots with an SRI-verified Sandbox module URL in msg.src.
// No DOM access. FS/TTY reach the page only through postMessage.

var box = null;
var stop = null;
var ctl = null;
var job = 0;
var port = null;
var send = function(msg, list){
  if(port) port.postMessage(msg, list || []);
  else postMessage(msg, list || []);
};
var ok = function(id, value){ send({id: id, ok: 1, value: value}) };
var no = function(id, err){ send({id: id, ok: 0, err: String(err && err.message || err)}) };
var out = function(ch, text){ send({ch: ch, text: String(text == null ? '' : text)}) };

var under = function(home, path){
  var h = String(home || '').replace(/\/$/, '');
  var p = String(path || '');
  if(!h) return false;
  return p === h || p.indexOf(h + '/') === 0;
};

var wrap = function(home){
  var vfs = box.kernel.vfs;
  return {
    mkdir: function(p, o){ return box.fs.mkdir(p, o) },
    writeFile: function(p, d){ return box.fs.writeFile(p, d) },
    readFile: async function(p){ return box.fs.readFile(p, null) },
    readdir: async function(p){
      var a = await box.fs.readdir(p);
      return a.map(function(x){ return x.name });
    },
    stat: async function(p){
      var s = await box.fs.stat(p);
      return {isDirectory: s.type === 'directory', size: s.size, mtime: s.mtime};
    },
    exists: function(p){ return box.fs.exists(p) },
    rm: async function(p, o){
      try{ return await box.fs.rm(p, o) }
      catch(e){
        if(o && o.force && /ENOENT/.test(String(e && e.message || e))) return;
        throw e;
      }
    },
    watch: function(p){
      if(stop){ try{ stop() }catch(e){} stop = null }
      var base = String(p || '').replace(/\/$/, '');
      stop = vfs.watch(base, function(ev){
        try{
          var at = ev && ev.path || '';
          if(!under(base, at) && !(ev && ev.oldPath && under(base, ev.oldPath))) return;
          var name = at.indexOf(base + '/') === 0 ? at.slice(base.length + 1) : '';
          if(name) out('fs', name);
        }catch(e){ out('err', 'lifo watch: ' + (e && e.message || e)) }
      });
      return 1;
    },
    unwatch: function(){
      if(stop){ try{ stop() }catch(e){} stop = null }
      return 1;
    }
  };
};

var fs = null;
var home = '/home/user';

var onmsg = async function(msg){
  msg = msg || {};
  var id = msg.id, op = msg.op;
  try{
    if(op === 'boot'){
      if(box) throw Error('lifo: already booted');
      if(!msg.src) throw Error('lifo: missing module src');
      home = msg.home || '/home/user';
      var mod = await import(msg.src);
      if(!mod || !mod.Sandbox) throw Error('lifo: Sandbox missing');
      box = await mod.Sandbox.create({
        persist: false,
        cwd: home,
        env: msg.env || {}
      });
      fs = wrap(home);
      ok(id, {cwd: box.cwd});
      return;
    }
    if(!box) throw Error('lifo: not booted');
    if(op === 'fs'){
      var fn = fs[msg.fn];
      if(!fn) throw Error('lifo: bad fs op');
      var got = await fn.apply(fs, msg.args || []);
      if(got instanceof Uint8Array){
        var copy = got.buffer.slice(got.byteOffset, got.byteOffset + got.byteLength);
        send({id: id, ok: 1, bin: 1, value: copy}, [copy]);
      }else ok(id, got);
      return;
    }
    if(op === 'cwd'){
      box.cwd = msg.path;
      ok(id, box.cwd);
      return;
    }
    if(op === 'run'){
      // Own this job; a later run aborts us, and finishing must not clear a newer ctl.
      var mine = ++job;
      if(ctl) ctl.abort();
      var mineCtl = new AbortController();
      ctl = mineCtl;
      try{
        // Do not pass page cwd — box.cwd already tracks cd/export across runs.
        var res = await box.commands.run(msg.cmd, {
          signal: mineCtl.signal,
          onStdout: function(t){ out('out', t) },
          onStderr: function(t){ out('err', t) }
        });
        ok(id, {exitCode: res.exitCode, cwd: box.cwd});
      }finally{
        if(mine === job && ctl === mineCtl) ctl = null;
      }
      return;
    }
    if(op === 'kill'){
      if(ctl) ctl.abort();
      ok(id, 1);
      return;
    }
    if(op === 'die'){
      if(stop){ try{ stop() }catch(e){} stop = null }
      if(ctl) ctl.abort();
      if(box && box.destroy) await box.destroy();
      box = null; fs = null; ctl = null;
      ok(id, 1);
      if(port){ /* node worker stays up until unref/terminate */ }
      else if(typeof close === 'function') close();
      return;
    }
    throw Error('lifo: bad op');
  }catch(e){ no(id, e) }
};

// Browser Workers get onmessage immediately; Node worker_threads upgrades to parentPort.
if(typeof self !== 'undefined'){
  self.onmessage = function(ev){ onmsg(ev.data) };
}
(async function(){
  try{
    var wt = await import('node:worker_threads');
    if(wt && wt.parentPort){
      port = wt.parentPort;
      port.on('message', function(msg){ onmsg(msg) });
    }
  }catch(e){}
})();

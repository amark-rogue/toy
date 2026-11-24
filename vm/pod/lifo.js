// Lifo richer-shell backend: Worker-hosted Sandbox, message-pass FS/TTY.
// Guest eval stays in vm/pod/wrun.js (no page DOM). Page owns OPFS via pod.seed/pod.copy.
// CDN: esm.sh dependency-complete @lifo-sh/core@0.10.29 core.bundle, SRI fetch → blob URL.
//
// Limit: line-oriented commands only (toy/aid send complete lines). No stdin to a live
// process (cat/readline/node REPL). Ctrl-C cancels the active run. Queued lines wait.

;(function(pod){

pod.lifo = pod.lifo || {};

pod.lifo.url = 'https://esm.sh/@lifo-sh/core@0.10.29/es2022/core.bundle.mjs';
pod.lifo.sri = 'sha384-TAgN+kQG3Gf1soEFfamIFGp2T3atP32SYs8Fq7ZPvy6WPz6wHc7Nm6vTGv4XCVIK';
pod.lifo.why = 'lifo: line commands only — no live process stdin (use Ctrl-C to cancel)';

pod.lifo.at = function(){
  var base = demo.base || '';
  // demo.base is the vm/ folder (from currentScript). Append pod/wrun.js there.
  if(!base && typeof document !== 'undefined' && document.currentScript && document.currentScript.src){
    base = String(document.currentScript.src).replace(/[^/]*$/, '');
  }
  if(!base) base = 'vm/';
  if(base.slice(-1) !== '/') base += '/';
  if(typeof location !== 'undefined' && location.href){
    return new URL(base + 'pod/wrun.js', location.href).href;
  }
  return base + 'pod/wrun.js';
};

pod.lifo.cdn = function(){
  if(pod.lifo.blob) return Promise.resolve(pod.lifo.blob);
  if(pod.lifo.net) return pod.lifo.net;
  if(!window.fetch) return Promise.reject(Error('lifo: fetch required for SRI pin'));
  pod.lifo.net = fetch(pod.lifo.url, {
    mode: 'cors',
    credentials: 'omit',
    integrity: pod.lifo.sri
  }).then(function(res){
    if(!res.ok) throw Error('lifo: cdn ' + res.status);
    return res.blob();
  }).then(function(bin){
    pod.lifo.blob = URL.createObjectURL(bin);
    return pod.lifo.blob;
  }).catch(function(err){
    pod.lifo.net = 0;
    throw err;
  });
  return pod.lifo.net;
};

pod.lifo.ask = function(op, extra){
  return new Promise(function(yes, no){
    if(!pod.lifo.bus) return no(Error('lifo: worker down'));
    var id = (pod.lifo.seq = (pod.lifo.seq || 0) + 1);
    pod.lifo.pending[id] = {yes: yes, no: no};
    var msg = {id: id, op: op};
    if(extra){
      var k;
      for(k in extra) if(Object.prototype.hasOwnProperty.call(extra, k)) msg[k] = extra[k];
    }
    try{ pod.lifo.bus.postMessage(msg) }catch(e){
      delete pod.lifo.pending[id];
      no(e);
    }
  });
};

pod.lifo.safe = function(name){
  name = String(name || '');
  if(!name || name.indexOf('..') >= 0) return '';
  if(name.charAt(0) === '/') return '';
  return name;
};

pod.lifo.onmsg = function(ev){
  var msg = ev.data || {};
  if(msg.ch === 'out' || msg.ch === 'err'){
    if(pod.tty && !pod.mute && !pod.skip) pod.tty.write(msg.text || '');
    return;
  }
  if(msg.ch === 'fs'){
    var name = pod.lifo.safe(msg.text);
    if(name) pod.save(demo.home + '/' + name);
    return;
  }
  var wait = pod.lifo.pending[msg.id];
  if(!wait) return;
  delete pod.lifo.pending[msg.id];
  if(msg.ok){
    if(msg.bin && msg.value) wait.yes(new Uint8Array(msg.value));
    else wait.yes(msg.value);
  } else wait.no(Error(msg.err || 'lifo: rpc fail'));
};

pod.lifo.fs = function(){
  var call = function(fn, args){
    return pod.lifo.ask('fs', {fn: fn, args: args || []});
  };
  return {
    mkdir: function(p, o){ return call('mkdir', [p, o]) },
    writeFile: function(p, d){ return call('writeFile', [p, d]) },
    readFile: function(p){ return call('readFile', [p]) },
    readdir: function(p){ return call('readdir', [p]) },
    stat: function(p){ return call('stat', [p]) },
    exists: function(p){ return call('exists', [p]) },
    rm: function(p, o){ return call('rm', [p, o]) },
    watch: function(p, o, fn){
      if('function' === typeof o){ fn = o; o = null }
      call('watch', [p]).catch(function(err){
        if(pod.tty) pod.tty.write('lifo watch: ' + (err && err.message || err) + '\r\n');
      });
      return {close: function(){
        return call('unwatch', []).catch(function(){});
      }};
    }
  };
};

pod.lifo.next = function(){
  if(pod.lifo.busy || !pod.lifo.wait || !pod.lifo.wait.length) return;
  var cmd = pod.lifo.wait.shift();
  pod.lifo.exec(cmd);
};

pod.lifo.exec = function(cmd){
  pod.lifo.busy = 1;
  pod.idle = 0;
  return pod.lifo.ask('run', {cmd: cmd}).then(function(res){
    var cwd = res && res.cwd || demo.cwd;
    demo.cwd = cwd;
    try{ localStorage.setItem('demo.cwd', demo.cwd) }catch(e){}
    if(pod.tip) pod.tip(cwd);
  }, function(err){
    if(pod.tty && !pod.mute) pod.tty.write(String(err && err.message || err) + '\r\n');
    if(pod.tip) pod.tip(demo.cwd);
  }).then(function(){
    pod.lifo.busy = 0;
    pod.lifo.next();
  }).catch(function(err){
    pod.lifo.busy = 0;
    if(pod.tty && !pod.mute) pod.tty.write(String(err && err.message || err) + '\r\n');
    if(pod.tip) pod.tip(demo.cwd);
    pod.lifo.next();
  });
};

pod.lifo.term = function(){
  pod.lifo.buf = '';
  pod.lifo.wait = [];
  pod.lifo.busy = 0;
  pod.lifo.told = 0;
  return {
    attach: function(){},
    setCwd: function(cwd){
      demo.cwd = cwd || demo.home;
      return pod.lifo.ask('cwd', {path: demo.cwd}).catch(function(){});
    },
    input: function(raw){
      raw = '' + (raw == null ? '' : raw);
      if(raw === String.fromCharCode(3)){
        pod.lifo.ask('kill', {}).catch(function(){});
        pod.lifo.wait = [];
        return;
      }
      // Build a line when the host streams characters; toy/aid usually send a full line.
      if(!/[\r\n]/.test(raw)){
        if(pod.lifo.busy){
          if(!pod.lifo.told && pod.tty && !pod.mute){
            pod.lifo.told = 1;
            pod.tty.write('\r\n' + pod.lifo.why + '\r\n');
          }
          return;
        }
        pod.lifo.buf += raw;
        return;
      }
      var text = (pod.lifo.buf + raw).replace(/[\r\n]+/g, '\n');
      pod.lifo.buf = '';
      var parts = text.split('\n'), i, cmd;
      for(i = 0; i < parts.length; i++){
        cmd = parts[i];
        if(i === parts.length - 1 && !/[\r\n]$/.test(raw)){
          pod.lifo.buf = cmd;
          break;
        }
        if(!cmd){
          if(!pod.lifo.busy && pod.tip) pod.tip(demo.cwd);
          continue;
        }
        if(pod.lifo.busy) pod.lifo.wait.push(cmd);
        else pod.lifo.exec(cmd);
      }
    }
  };
};

pod.lifo.prep = function(){
  if(!window.Worker) return Promise.reject(Error('lifo: needs Web Worker'));
  if(!window.fetch || !window.URL || !URL.createObjectURL){
    return Promise.reject(Error('lifo: needs fetch + blob URL for SRI pin'));
  }
  if(pod.lifo.bus){
    return Promise.reject(Error('lifo: already running — stop before prep'));
  }
  pod.lifo.pending = {};
  return pod.lifo.cdn().then(function(href){
    var bus = new Worker(pod.lifo.at(), {type: 'module'});
    pod.lifo.bus = bus;
    bus.onmessage = pod.lifo.onmsg;
    bus.onerror = function(err){
      var all = pod.lifo.pending || {};
      pod.lifo.pending = {};
      Object.keys(all).forEach(function(id){
        all[id].no(Error(err && err.message || 'lifo: worker error'));
      });
    };
    var home = demo.home || '/home/user';
    var env = {HOME: home, USER: 'demo', TERM: 'xterm-256color', SHELL: '/bin/sh'};
    return pod.lifo.ask('boot', {src: href, home: home, env: env}).then(function(){
      pod.pod = {
        fs: pod.lifo.fs(),
        teardown: function(){ return pod.lifo.die() }
      };
      if(!pod.tty) pod.tty = new pod.Tty();
      pod.term = pod.lifo.term();
      return new Promise(function(yes){
        pod.yes = yes;
        if(pod.tip) pod.tip(home);
        else yes();
      });
    }).then(function(){
      pod.hot = 1;
      if(demo.opfs && demo.opfs.root) return pod.seed();
    }).then(function(){
      return pod.pod;
    });
  }).catch(function(err){
    pod.lifo.die();
    throw err;
  });
};

pod.lifo.die = function(){
  var bus = pod.lifo.bus;
  pod.lifo.bus = 0;
  pod.lifo.busy = 0;
  pod.lifo.wait = [];
  pod.lifo.buf = '';
  pod.lifo.told = 0;
  if(bus){
    try{ bus.postMessage({id: 0, op: 'die'}) }catch(e){}
    try{ bus.terminate() }catch(e){}
  }
  // Keep CDN blob for retry; only the guest worker is torn down.
  var all = pod.lifo.pending || {};
  pod.lifo.pending = {};
  Object.keys(all).forEach(function(id){
    all[id].no(Error('lifo: stopped'));
  });
};

}(demo.pod));

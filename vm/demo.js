// demo — pure JS "ssh" proxy + OPFS filesystem
// extends VM (one-way): uses VM.shim, VM.cmd.routes, VM.say, VM.fs.hook
// VM never imports or names demo — only generic hooks
// type host: demo
// cmds live in vm/js/<name>.js and load on first use

window.demo = {};

;(function(){
  sign.onsubmit = async (eve)=>{ eve?.preventDefault?.();
    if('demo' !== host.value.toLowerCase()){ return cop.sign(eve) }
    cop.ws = 0;
    try{ await demo.pod.add();
      demo.pod.cdn().catch(function(){});
    }catch(e){ demo.pod.bad = e }
    demo.boot({
      say: (out) => { kit.say(out, 'chat') },
      onready: () => { location.path = 'shell.html' },
      onshim: (ws) => { cop.ws = ws;
        while((cop.limbo||[]).length){ cop.ws.send(cop.limbo.shift()) }
      }
    });
  }
}());

// --- state ---
// /root matches vm/git.js + vm/npm.js defaults

demo.home = '/root';
demo.cwd = demo.home;
demo.say = function(){};
demo.push = function(raw){
  demo.say(demo.id ? JSON.stringify({'#':demo.id, '$':raw}) : raw);
};
demo.on = 0;
demo.job = Promise.resolve();
demo.rev = 0;
demo.jobs = {};

// --- path ---

demo.path = {};

demo.path.abs = function(raw){
  var s = (raw || '').trim() || '.';
  if('~' === s) return demo.home;
  if(0 === s.indexOf('~/')) return demo.home + s.slice(1);
  if('/' !== s.charAt(0)) s = demo.cwd.replace(/\/$/, '') + '/' + s;
  var out = [], i, p, all = s.split('/');
  for(i = 0; i < all.length; i++){
    p = all[i];
    if(!p || '.' === p) continue;
    if('..' === p){ out.pop(); continue }
    out.push(p);
  }
  return '/' + out.join('/');
};

demo.pty = {on: '\x1b[?2004h', off: '\x1b[?2004l'};

demo.path.tip = function(){
  var p = demo.cwd;
  if(p === demo.home) p = '~';
  else if(0 === p.indexOf(demo.home + '/')) p = '~' + p.slice(demo.home.length);
  return demo.pty.on + p + ' $ ';
};

demo.path.base = function(p){
  if(!p || '/' === p) return '';
  var i = p.lastIndexOf('/');
  return i < 0 ? p : p.slice(i + 1);
};

demo.path.up = function(p){
  if(!p || '/' === p) return '/';
  var i = p.lastIndexOf('/');
  return i <= 0 ? '/' : p.slice(0, i);
};

demo.path.bits = function(path){
  return demo.path.abs(path).split('/').filter(Boolean);
};

// --- OPFS ---

demo.opfs = {};
demo.opfs.root = null;
demo.opfs.chain = Promise.resolve();

// Virtual FileSystemDirectoryHandle for private/incognito fallback
demo.opfs.fake = function(name, kind){
  return {
    name: name || '',
    kind: kind || 'directory',
    files: {},
    data: null,
    getDirectoryHandle: async function(n, opt){
      var hit = this.files[n];
      if(hit && 'file' === hit.kind) throw Error(n + ': Is a directory');
      if(!hit){
        if(!opt || !opt.create) throw Error(n + ': No such file or directory');
        hit = this.files[n] = demo.opfs.fake(n, 'directory');
      }
      return hit;
    },
    getFileHandle: async function(n, opt){
      var hit = this.files[n];
      if(hit && 'directory' === hit.kind) throw Error(n + ': Is a directory');
      if(!hit){
        if(!opt || !opt.create) throw Error(n + ': No such file or directory');
        hit = this.files[n] = demo.opfs.fake(n, 'file');
      }
      return hit;
    },
    removeEntry: async function(n, opt){
      var hit = this.files[n];
      if(!hit) throw Error(n + ': No such file or directory');
      if('directory' === hit.kind && !(opt && opt.recursive) && Object.keys(hit.files).length){
        throw Error(n + ': is a directory');
      }
      delete this.files[n];
      demo.opfs.save();
    },
    entries: async function*(){
      for(var k in this.files){
        if(Object.prototype.hasOwnProperty.call(this.files, k)){
          yield [k, this.files[k]];
        }
      }
    },
    getFile: async function(){
      var self = this;
      return { arrayBuffer: async () => self.data || new ArrayBuffer(0) };
    },
    createWritable: async function(){
      var self = this;
      return {
        write: async function(b){
          if(typeof b === 'string') self.data = new TextEncoder().encode(b).buffer;
          else if(b && b.buffer) self.data = b.buffer;
          else if(b instanceof ArrayBuffer) self.data = b;
          else self.data = new ArrayBuffer(0);
        },
        close: async function(){ demo.opfs.save(); }
      };
    }
  };
};

demo.opfs.pack = function(node){
  if(!node) return null;
  if('file' === node.kind){
    var str = '';
    if(node.data) try{ str = new TextDecoder('utf-8').decode(node.data) }catch(e){}
    return { kind: 'file', text: str };
  }
  var files = {}, k;
  for(k in node.files){
    if(Object.prototype.hasOwnProperty.call(node.files, k)){
      files[k] = demo.opfs.pack(node.files[k]);
    }
  }
  return { kind: 'directory', files: files };
};

demo.opfs.unpack = function(obj, node){
  if(!obj || !node) return;
  var k, child;
  for(k in obj.files){
    if(Object.prototype.hasOwnProperty.call(obj.files, k)){
      if('file' === obj.files[k].kind){
        child = demo.opfs.fake(k, 'file');
        child.data = new TextEncoder().encode(obj.files[k].text || '').buffer;
        node.files[k] = child;
      } else {
        child = demo.opfs.fake(k, 'directory');
        demo.opfs.unpack(obj.files[k], child);
        node.files[k] = child;
      }
    }
  }
};

demo.opfs.save = function(){
  if(!demo.opfs.virtual) return;
  try{
    var obj = demo.opfs.pack(demo.opfs.virtual);
    localStorage.setItem('demo.opfs.virtual', JSON.stringify(obj));
  }catch(e){}
};

demo.opfs.load = function(){
  if(!demo.opfs.virtual) return;
  try{
    var raw = localStorage.getItem('demo.opfs.virtual');
    if(raw){
      var obj = JSON.parse(raw);
      if(obj && 'directory' === obj.kind) demo.opfs.unpack(obj, demo.opfs.virtual);
    }
  }catch(e){}
};

demo.opfs.init = async function(){
  demo.opfs.chain = Promise.resolve();
  try{
    if(navigator.storage && navigator.storage.getDirectory){
      demo.opfs.root = await navigator.storage.getDirectory();
    }
  }catch(e){}
  if(!demo.opfs.root){
    demo.opfs.virtual = demo.opfs.virtual || demo.opfs.fake('', 'directory');
    demo.opfs.root = demo.opfs.virtual;
    demo.opfs.load();
  }
};

// directory handle for path; make=1 creates parents
demo.opfs.dir = async function(path, make){
  var bits = demo.path.bits(path), cur = demo.opfs.root, i;
  for(i = 0; i < bits.length; i++){
    try{
      cur = await cur.getDirectoryHandle(bits[i], { create: !!make });
    }catch(e){
      var err = new Error(demo.path.abs(path) + ': ' + (make ? e.message : 'No such file or directory'));
      err.code = 'missing';
      throw err;
    }
  }
  return cur;
};

// file handle; make creates file (+ parents if make)
demo.opfs.file = async function(path, make){
  var abs = demo.path.abs(path);
  if('/' === abs) throw Error(abs + ': Is a directory');
  var par = demo.path.up(abs);
  var name = demo.path.base(abs);
  var dir;
  try{
    dir = await demo.opfs.dir(par, make);
  }catch(e){
    throw Error(abs + ': No such file or directory');
  }
  try{
    return await dir.getFileHandle(name, { create: !!make });
  }catch(e){
    // might be a directory
    try{
      await dir.getDirectoryHandle(name);
      throw Error(abs + ': Is a directory');
    }catch(e2){
      if(e2.message && e2.message.indexOf('Is a directory') >= 0) throw e2;
      throw Error(abs + ': No such file or directory');
    }
  }
};

demo.opfs.exists = async function(path){
  var abs = demo.path.abs(path);
  if('/' === abs) return { kind: 'directory' };
  var par = demo.path.up(abs);
  var name = demo.path.base(abs);
  var dir;
  try{ dir = await demo.opfs.dir(par, 0) }catch(e){ return null }
  try{
    await dir.getDirectoryHandle(name);
    return { kind: 'directory' };
  }catch(e){}
  try{
    await dir.getFileHandle(name);
    return { kind: 'file' };
  }catch(e){}
  return null;
};

demo.opfs.mkdirp = async function(path){
  await demo.opfs.dir(path, 1);
  demo.rev += 1;
};

demo.opfs.write = async function(path, data){
  var abs = demo.path.abs(path);
  await demo.opfs.mkdirp(demo.path.up(abs));
  var fh = await demo.opfs.file(abs, 1);
  var w = await fh.createWritable();
  await w.write(data);
  await w.close();
  demo.rev += 1;
};

demo.opfs.read = async function(path){
  var fh = await demo.opfs.file(path, 0);
  var file = await fh.getFile();
  return await file.arrayBuffer();
};

demo.opfs.readText = async function(path){
  var buf = await demo.opfs.read(path);
  return new TextDecoder('utf-8').decode(buf);
};

demo.opfs.list = async function(path){
  var dir = await demo.opfs.dir(path, 0);
  var out = [];
  for await (var ent of dir.entries()){
    out.push({ name: ent[0], kind: ent[1].kind });
  }
  out.sort(function(a, b){
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
  return out;
};

demo.opfs.rm = async function(path, deep){
  var abs = demo.path.abs(path);
  if('/' === abs || demo.home === abs) throw Error('rm: cannot remove ' + abs);
  var par = demo.path.up(abs);
  var name = demo.path.base(abs);
  var dir = await demo.opfs.dir(par, 0);
  var hit = await demo.opfs.exists(abs);
  if(!hit) throw Error('rm: ' + abs + ': No such file or directory');
  if(hit.kind === 'directory' && !deep) throw Error('rm: ' + abs + ': is a directory');
  await dir.removeEntry(name, { recursive: !!deep });
  demo.rev += 1;
};

demo.opfs.cp = async function(src, dst, deep){
  var from = demo.path.abs(src);
  var to = demo.path.abs(dst);
  var hit = await demo.opfs.exists(from);
  if(!hit) throw Error('cp: ' + from + ': No such file or directory');
  var destHit = await demo.opfs.exists(to);
  if(destHit && destHit.kind === 'directory'){
    to = (to === '/' ? '' : to) + '/' + demo.path.base(from);
  }
  if(hit.kind === 'directory'){
    if(!deep) throw Error('cp: ' + from + ' is a directory (not copied)');
    await demo.opfs.mkdirp(to);
    var list = await demo.opfs.list(from);
    var i;
    for(i = 0; i < list.length; i++){
      await demo.opfs.cp(from + '/' + list[i].name, to + '/' + list[i].name, 1);
    }
    return to;
  }
  var buf = await demo.opfs.read(from);
  await demo.opfs.write(to, buf);
  return to;
};

demo.opfs.seed = async function(){
  var mark = await demo.opfs.exists('/root/readme.md');
  if(mark) return;
  await demo.opfs.mkdirp('/root/notes');
  await demo.opfs.mkdirp('/tmp');
  await demo.opfs.write('/root/readme.md',
    'Welcome to the demo OPFS shell.\n\n' +
    'Try: ls, cd, cat, mkdir, touch, echo, cp, rm, pwd\n' +
    'Then: node hello.js, pipes, redirects, scripts, git, npm and npx\n' +
    'Also: git clone https://github.com/amark/gun\n' +
    '      npm install gun\n'
  );
  await demo.opfs.write('/root/hello.js', 'console.log("hi from demo");\n');
  await demo.opfs.write('/root/notes/todo.txt',
    '- ls\n- cat readme.md\n- git clone a repo\n- cd into it\n'
  );
};

// --- fs facade (the richer shell replaces these methods when loaded) ---

demo.fs = {};
demo.fs.mkdirp = function(path){ return demo.opfs.mkdirp(path) };
demo.fs.write = function(path, data){ return demo.opfs.write(path, data) };
demo.fs.read = function(path){ return demo.opfs.read(path) };
demo.fs.exists = function(path){ return demo.opfs.exists(path) };
demo.fs.list = function(path){ return demo.opfs.list(path) };

// --- words / flags ---

demo.words = function(s){
  var out = [], cur = '', q = '', i, c;
  s = s || '';
  for(i = 0; i < s.length; i++){
    c = s.charAt(i);
    if(q){
      if(c === q) q = '';
      else if('\\' === c && i + 1 < s.length){ cur += s.charAt(++i) }
      else cur += c;
    } else if('"' === c || "'" === c){ q = c }
    else if('\\' === c && i + 1 < s.length){ cur += s.charAt(++i) }
    else if(/\s/.test(c)){ if(cur){ out.push(cur); cur = '' } }
    else cur += c;
  }
  if(cur) out.push(cur);
  return out;
};

demo.flag = function(args){
  var flags = '', rest = [], i, a;
  for(i = 0; i < args.length; i++){
    a = args[i];
    if(a && '-' === a.charAt(0) && a.length > 1 && !/^\-\d/.test(a)) flags += a.slice(1);
    else rest.push(a);
  }
  return { flags: flags, rest: rest };
};

// --- commands: core runner; bins live in vm/js/<bin>.js ---

demo.cmd = {};
demo.cmd.got = {}; // bin → Promise | 0 (miss)

// load vm/js/<bin>.js once; script sets demo.cmd[bin]
demo.cmd.load = function(bin){
  if(demo.cmd.got[bin]) return demo.cmd.got[bin];
  if(0 === demo.cmd.got[bin]) return Promise.reject(Error('not found'));
  // only safe short names
  if(!/^[a-z][a-z0-9]*$/.test(bin)){
    demo.cmd.got[bin] = 0;
    return Promise.reject(Error('not found'));
  }
  demo.cmd.got[bin] = new Promise(function(yes, no){
    var s = document.createElement('script');
    s.src = demo.base + 'js/' + bin + '.js';
    s.onload = function(){
      if('function' === typeof demo.cmd[bin]) yes(demo.cmd[bin]);
      else { demo.cmd.got[bin] = 0; no(Error('not found')) }
    };
    s.onerror = function(){
      demo.cmd.got[bin] = 0;
      no(Error('not found'));
    };
    document.head.appendChild(s);
  });
  return demo.cmd.got[bin];
};

// resolve bin → fn (cached after first load)
demo.cmd.need = async function(bin){
  if('function' === typeof demo.cmd[bin]) return demo.cmd[bin];
  if(0 === demo.cmd.got[bin]) return null;
  try{
    return await demo.cmd.load(bin);
  }catch(e){
    return null;
  }
};

demo.cmd.one = async function(line){
  line = (line || '').trim();
  if(!line) return { out: '', ok: 1 };
  var words = demo.words(line);
  var bin = (words.shift() || '').toLowerCase();
  var fn = await demo.cmd.need(bin);
  if(!fn) return { out: 'sh: ' + bin + ': not found\n', ok: 0 };
  var out = 'echo' === bin ? await fn(words, line) : await fn(words);
  var bad = out && /: (No such|Not a|Is a|missing|not found|File exists|cannot remove|Directory)/i.test(out);
  return { out: out || '', ok: !bad };
};

demo.cmd.run = async function(line){
  line = (line || '').replace(/[\r\n]+$/, '').trim();
  if(!line) return '';
  var chunks = [], cur = '', i, c, q = '';
  for(i = 0; i < line.length; i++){
    c = line.charAt(i);
    if(q){
      cur += c;
      if(c === q) q = '';
      continue;
    }
    if('"' === c || "'" === c){ q = c; cur += c; continue }
    if('&' === c && '&' === line.charAt(i + 1)){
      chunks.push({ s: cur, and: 1 });
      cur = ''; i++; continue;
    }
    if(';' === c){
      chunks.push({ s: cur, and: 0 });
      cur = ''; continue;
    }
    cur += c;
  }
  if(cur.trim()) chunks.push({ s: cur, and: 0 });
  var out = '', r, j;
  for(j = 0; j < chunks.length; j++){
    r = await demo.cmd.one(chunks[j].s);
    out += r.out || '';
    if(!r.ok && chunks[j].and) break;
  }
  return out;
};

// --- queue ---

demo.wait = function(fn){
  demo.job = demo.job.then(fn, fn);
  return demo.job;
};

// SSH/PTY shaped output: shell keeps the last prompt in shell.raw.
// After login tip is primed, each unit is:  cmd\r\n + 2004l + body + tip
// so stream is  2004h~ $ ls .\r\n2004l\rfiles\n2004h~ $   — same as real serial/ssh.
demo.echo = function(msg, body){
  var out = (msg || '') + '\r\n' + demo.pty.off + '\r';
  if(body){
    body = body.replace(/\r?\n/g, '\r\n');
    out += body;
    if(body.indexOf('\x1b[H') < 0 && !/\r\n$/.test(body)) out += '\r\n';
  }
  demo.at = 0;
  out += demo.path.tip();
  demo.at = 1;
  demo.tipped = 1;
  demo.push(out);
};

// re-prompt only (routes call serial0_send("\n") when done — same as git/npm on VM)
// skip if we already ended on a tip so leftover never becomes "~ $ ~ $ "
demo.tip = function(){
  if(demo.at) return;
  demo.tipped = 1;
  demo.at = 1;
  demo.push(demo.path.tip());
};

// like a login banner: ensure one prompt sits in shell.raw before any cmd
demo.prime = function(){
  if(demo.tipped || demo.at) return;
  demo.tip();
};

// if a route forgot to close, push a fresh prompt so the splitter can resync
demo.sync = function(){
  if(demo.at) return;
  demo.push('\r\n');
  demo.tip();
};

// emu stand-in for VM.shim → same serial0_send surface as v86
demo.emu = {
  serial0_send: function(cmd){
    if(demo.route && !('' + (cmd || '')).replace(/[\r\n]+$/, '')){
      demo.end = 1;
      return;
    }
    demo.wait(async function(){
      if(!demo.ok) return;
      demo.prime();
      cmd = ('' + (cmd || '')).replace(/[\r\n]+$/, '');
      if(!cmd){
        demo.tip();
        return;
      }
      var body = await demo.cmd.run(cmd);
      demo.echo(cmd, body);
    });
  }
};

// --- shim: WebSocket stand-in, reuse VM.shim (routes + serial) ---
// app.html only knows cop.ws.send / onmessage — demo plugs into that same slot.

demo.shim = function(){
  var core = VM.shim(demo.emu);
  return {
    readyState: 1,
    send: function(msg, id){
      if(null == msg) return;
      msg = '' + msg;
      // optional JSON envelope some clients use; bare string is the ssh path
      if('{' === msg.charAt(0)){
        try{
          var obj = JSON.parse(msg);
          if(obj && obj.size){
            if(demo.pod.ok) demo.pod.size(obj.size);
            return;
          }
          id = obj['#'] || '';
          if(obj && null != obj.$) msg = '' + obj.$;
          else return;
        }catch(e){}
      }
      demo.wait(async function(){
        if(!demo.ok) return;
        var state;
        demo.id = id || '';
        if(id){
          state = demo.jobs[id] || (demo.jobs[id] = {cwd:demo.home, at:0});
          demo.cwd = state.cwd;
          demo.at = state.at;
          demo.tipped = state.at;
        }
        demo.prime();
        demo.route = 1;
        demo.end = 0;
        var own = 0;
        try{
          var cmd = (msg || '').replace(/[\r\n]+$/, '').trim();
          var job;
          if(demo.pod.ok && demo.pod.on){
            own = 1;
            demo.pod.send(msg);
            return;
          }
          if(demo.pod.ok && demo.pod.use(cmd)){
            own = await demo.pod.start(msg);
            if(own) return;
          }
          if(VM.ready && (job = VM.cmd.route(cmd, demo.emu))){
            demo.at = 0;
            if(job && job.then) await job;
            return;
          }
          demo.route = 0;
          cmd = (msg || '').replace(/[\r\n]+$/, '');
          if(!cmd){ demo.tip(); return; }
          var body = await demo.cmd.run(cmd);
          demo.echo(cmd, body);
        }finally{
          demo.route = 0;
          if(state){ state.cwd = demo.cwd; state.at = demo.at }
          if(own) return;
          if(demo.end) demo.tip();
          else if(!demo.at) demo.sync();
        }
      });
    },
    close: function(){
      this.readyState = 3;
      demo.on = 0;
      VM.ready = false;
      VM.fs.hook = null;
      if(demo.pod.stop) demo.pod.stop();
    }
  };
};

// --- wire VM.fs + VM.say so shared routes write OPFS and stream chat ---

demo.wire = function(){
  demo.on = 1;
  VM.ready = true;
  VM.say = function(s){
    if(!s) return;
    demo.at = 0;
    demo.push(('' + s).replace(/\r?\n/g, '\r\n'));
  };
  VM.fs.hook = {
    dir: function(emu, path){
      // queue mkdir so put can await the chain (git/npm call dir sync)
      demo.opfs.chain = demo.opfs.chain.then(function(){
        return demo.fs.mkdirp(path);
      });
    },
    put: async function(emu, path, data){
      await demo.opfs.chain;
      await demo.fs.write(path, data);
    }
  };
};

// --- boot ---

demo.boot = function(opt){
  opt = opt || {};
  demo.say = opt.say || demo.say;
  demo.fail = opt.fail || function(err){ demo.push('demo: ' + err + '\n') };
  demo.ok = 0;
  demo.tipped = 0;
  demo.at = 0;
  demo.job = Promise.resolve();
  demo.jobs = {};
  demo.id = '';
  demo.route = 0;
  demo.end = 0;

  var start = async function(){
    try{
      await demo.opfs.init();
    }catch(e){
      demo.fail(e.message || e);
      return;
    }
    try{
      var saved = localStorage.getItem('demo.cwd');
      if(saved) demo.cwd = saved;
    }catch(e){}
    try{
      await demo.opfs.seed();
    }catch(e){
      demo.fail('seed failed: ' + (e.message || e));
      return;
    }
    // ensure cwd still exists
    var hit = await demo.opfs.exists(demo.cwd);
    if(!hit || hit.kind !== 'directory') demo.cwd = demo.home;
    demo.wire();
    demo.ok = 1;
    // wait for vm/*.js plugs (git/npm/…) then same plug as VM → shell
    var ws = demo.shim();
    VM.prep().then(function(){
      if(opt.onshim) opt.onshim(ws);
      if(opt.onready) opt.onready();
      if(window.Worker && demo.pod.ok){
        demo.pod.wait(function(){ demo.pod.prep().catch(function(){}) }, 2500);
      }
    });
  };

  start().catch(function(e){
    demo.fail('boot failed: ' + (e.message || e));
  });
};

// --- POD ---

demo.base = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '') || 'vm/';

// Load the richer shell only for demo users. Local parts start on input;
// the larger CDN runtime starts once submit proves the user wants demo mode.
demo.pod = {mod: 0, got: {}, ok: 0, on: 0};

demo.pod.one = function(name){
  if(demo.pod.got[name]) return demo.pod.got[name];
  if(!/^[a-z]+$/.test(name)) return Promise.reject(Error('bad demo part'));
  demo.pod.got[name] = new Promise(function(yes, no){
    var s = document.createElement('script');
    s.src = demo.base + 'pod/' + name + '.js';
    s.onload = function(){ yes(1) };
    s.onerror = function(){
      demo.pod.got[name] = 0;
      no(Error('demo part could not load: ' + name));
    };
    document.head.appendChild(s);
  });
  return demo.pod.got[name];
};

demo.pod.add = function(){
  if(demo.pod.mod) return demo.pod.mod;
  demo.pod.mod = demo.pod.one('core').then(function(){
    return Promise.all(['fs', 'term', 'boot', 'run'].map(demo.pod.one));
  }).then(function(){
    demo.pod.ok = 1;
    return demo.pod;
  }).catch(function(err){
    demo.pod.mod = 0;
    throw err;
  });
  return demo.pod.mod;
};

demo.pod.hint = function(eve){
  if('demo' !== (host.value || '').trim().toLowerCase()) return;
  var get = demo.pod.add();
  get.catch(function(err){ demo.pod.bad = err });
  if(eve && 'keydown' === eve.type && 'Enter' === eve.key){
    get.then(function(){ return demo.pod.cdn() }).catch(function(){});
  }
  return get;
};

host.addEventListener('input', demo.pod.hint);
host.addEventListener('keydown', demo.pod.hint);

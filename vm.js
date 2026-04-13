// VM — browser Linux via v86
// boot, snapshot, filesystem, command intercepts, serial I/O, server proxy

var VM = {};

// --- config ---

VM.cdn = "https://cdn.jsdelivr.net/gh/abenezermario/v86-alpine@main";
VM.mem = 256;
VM.emu = null;
VM.ready = false;
VM.queue = [];
VM.say = function(){};

// --- snapshot (stub — add back as external feature) ---

VM.snap = {};
VM.snap.save = function(){ return Promise.resolve() };
VM.snap.load = function(){ return Promise.resolve(null) };

// --- filesystem ---

VM.fs = {};

VM.fs.dir = function(emu, path){
  var parts = path.split('/').filter(Boolean);
  var cur = '';
  for(var i = 0; i < parts.length; i++){
    cur += '/' + parts[i];
    var info = emu.fs9p.SearchPath(cur);
    if(info.id === -1){
      var par = '/' + parts.slice(0, i).join('/') || '/';
      var pi = emu.fs9p.SearchPath(par);
      if(pi.id !== -1) emu.fs9p.CreateDirectory(parts[i], pi.id);
    }
  }
};

VM.fs.put = async function(emu, path, data){
  var dir = path.slice(0, path.lastIndexOf('/'));
  if(dir) VM.fs.dir(emu, dir);
  await emu.create_file(path, data);
};

// --- serial I/O ---

VM.io = {};

VM.io.buf = '';
VM.io.boot = 0;
VM.io.nonce = '';
VM.io.tip = null;
VM.io.primed = false; // true after first prompt seen

VM.io.listen = function(emu, say){
  VM.io.buf = '';

  emu.add_listener("serial0-output-byte", (byte) => {
    var c = String.fromCharCode(byte);
    VM.io.buf += c;

    // boot log (before ready)
    if(VM.io.boot < 3 && VM.io.tip){
      var lines = VM.io.buf.replace(/\x1b\[[^m]*m/g, '').split('\n');
      var last = lines[lines.length - 1] || lines[lines.length - 2] || '';
      if(last.trim()) VM.io.tip.textContent = last.trim().slice(0, 80);
    }

    // boot state machine
    if(VM.io.boot === 0 && VM.io.buf.includes("login:")){
      VM.io.boot = 1;
      emu.serial0_send("root\n");
      VM.io.buf = '';
      return;
    }
    if(VM.io.boot === 1 && VM.io.buf.includes("~#")){
      VM.io.boot = 2;
      emu.serial0_send("export PS1='$ '\n");
      VM.io.buf = '';
      return;
    }
    if(VM.io.boot === 2 && /\n\$ /.test(VM.io.buf)){
      VM.io.done(emu, true);
      return;
    }

    // nonce detection (faster ready signal)
    if(VM.io.nonce && VM.io.buf.includes(VM.io.nonce)){
      VM.io.done(emu);
      return;
    }

    // serial proxy response capture
    if(VM.io.buf.includes('===H')){
      var m = VM.io.buf.match(/===H(\w+)===\r?\n([\s\S]*?)===E\1===/);
      if(m && VM.srv.pending[m[1]]){
        var body = m[2].replace(/\r\n/g, '\n').trim();
        VM.srv.pending[m[1]](body);
        delete VM.srv.pending[m[1]];
        VM.io.buf = '';
        return;
      }
    }

    // debounced output to chat — wait for prompt before flushing
    if(window.vmSerial) clearTimeout(window.vmSerial);
    window.vmSerial = setTimeout(() => {
      if(!VM.ready) return;
      // don't flush while waiting for proxy response
      if(VM.io.buf.includes('===H') && Object.keys(VM.srv.pending).length) return;
      var out = VM.io.buf.replace(/\x1b\[6n/g, '');
      if(!out){ VM.io.buf = ''; return }
      var clean = out.replace(/\x1b\[[^m]*m/g, '');
      // hold output until we see a prompt ($ at end of line)
      if(!VM.io.primed && !/\$\s*$/.test(clean)) return;
      VM.io.primed = true;
      say(out);
      VM.srv.scan(out);
      VM.io.buf = '';
    }, 50);
  });

  // download progress
  var dl = {};
  emu.add_listener("download-progress", (e) => {
    if(!e.file_name || dl[e.file_name]) return;
    dl[e.file_name] = 1;
    if(VM.io.tip) VM.io.tip.textContent = 'Loading ' + e.file_name.split('/').pop();
  });
  emu.add_listener("download-error", (e) => {
    if(VM.io.tip) VM.io.tip.textContent = 'Error: ' + (e.file_name || e.message || e);
  });
};

VM.io.done = function(emu, fresh){
  if(VM.io.tip){ VM.io.tip.textContent = ''; VM.io.tip.style.display = 'none' }
  VM.io.boot = 3;
  VM.io.buf = '';
  VM.ready = true;
  // flush queued commands (chat.html may have loaded before VM was ready)
  var flush = () => {
    if(kit.views && kit.views.size > 0){
      while(VM.queue.length > 0) emu.serial0_send(VM.queue.shift());
    } else { requestAnimationFrame(flush) }
  };
  flush();
};

// --- command intercepts ---

VM.cmd = {};

VM.cmd.routes = [
  { match: /^git\s+clone\s+/, run: function(s, emu){ return VM.git.run(s, emu) } },
  { match: /^npm\s+install\s+/, run: function(s, emu){ return VM.pkg.npm.run(s, emu) } },
  { match: /^pip\s+install\s+/, run: function(s, emu){ return VM.pkg.pip.run(s, emu) } },
  { match: /^apk\s+add\s+/, run: function(s, emu){ return VM.pkg.apk.run(s, emu) } },
];

VM.cmd.route = function(cmd, emu){
  for(var i = 0; i < VM.cmd.routes.length; i++){
    if(VM.cmd.routes[i].match.test(cmd)){
      VM.cmd.routes[i].run(cmd, emu);
      return true;
    }
  }
  return false;
};

// --- shim (WebSocket replacement) ---

VM.shim = function(emu){
  return {
    send: function(cmd){
      if(cmd && !cmd.endsWith('\n') && !cmd.endsWith('\r')) cmd += '\n';
      var trimmed = (cmd || '').replace(/[\r\n]+$/, '').trim();
      if(VM.ready && VM.cmd.route(trimmed, emu)) return;
      if(!VM.ready){ VM.queue.push(cmd) }
      else { emu.serial0_send(cmd) }
    }
  };
};

// --- boot ---

VM.boot = function(opt){
  opt = opt || {};
  var cdn = opt.cdn || VM.cdn;
  var mem = opt.mem || VM.mem;
  VM.say = opt.say || VM.say;
  VM.onready = opt.onready;
  VM.io.tip = opt.tip || null;

  if(VM.io.tip){ VM.io.tip.style.display = 'block'; VM.io.tip.textContent = 'Loading VM...' }

  // pre-warm: start loading snapshot immediately
  var snapPromise = VM.snap.load();

  var s = document.createElement('script');
  s.src = cdn + "/build/libv86.js";
  s.onload = () => {
    snapPromise.then((state) => {
      if(VM.io.tip) VM.io.tip.textContent = state ? 'Restoring...' : 'Downloading...';

      var cfg = {
        wasm_path: cdn + "/build/v86.wasm",
        memory_size: mem * 1024 * 1024,
        vga_memory_size: 8 * 1024 * 1024,
        bios: { url: cdn + "/bios/seabios.bin" },
        vga_bios: { url: cdn + "/bios/vgabios.bin" },
        filesystem: {
          baseurl: cdn + "/images/alpine-rootfs-flat",
          basefs: cdn + "/images/alpine-fs.json",
        },
        bzimage_initrd_from_filesystem: true,
        cmdline: "rw root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose modules=virtio_pci tsc=reliable mitigations=off random.trust_cpu=on console=ttyS0",
        net_device: { type: "virtio", relay_url: "fetch" },
        autostart: true,
        disable_keyboard: true,
        disable_mouse: true,
      };
      if(state){ cfg.initial_state = { buffer: state } }

      var emu = VM.emu = window.emulator = new V86(cfg);

      // snapshot restore: skip boot detection
      if(state){
        VM.io.boot = 3;
        emu.add_listener("emulator-ready", () => {
          VM.io.done(emu);
        });
      } else {
      }

      VM.io.listen(emu, VM.say);

      // create shim for app.html
      var ws = VM.shim(emu);
      if(opt.onshim) opt.onshim(ws);

      // load chat immediately — commands queue until VM is ready
      if(VM.onready) VM.onready();
    });
  };
  document.head.appendChild(s);
};

// --- git clone ---

VM.git = {};
VM.git.token = localStorage.gitToken || '';

VM.git.hosts = {
  'github.com': {
    tree: (o, r, b) => 'https://api.github.com/repos/' + o + '/' + r + '/git/trees/' + b + '?recursive=1',
    raw: (o, r, b, f) => 'https://raw.githubusercontent.com/' + o + '/' + r + '/' + b + '/' + f,
    auth: (h) => VM.git.token ? { Authorization: 'token ' + VM.git.token } : {},
  },
  'gitlab.com': {
    tree: (o, r, b) => 'https://gitlab.com/api/v4/projects/' + encodeURIComponent(o+'/'+r) + '/repository/tree?ref=' + b + '&recursive=true&per_page=100',
    raw: (o, r, b, f) => 'https://gitlab.com/' + o + '/' + r + '/-/raw/' + b + '/' + f,
    auth: (h) => VM.git.token ? { 'PRIVATE-TOKEN': VM.git.token } : {},
    parse: function(data){ return (data||[]).map(f => ({path:f.path, type:f.type==='tree'?'tree':'blob'})) },
  },
};

VM.git.run = function(cmd, emu){
  var m = cmd.match(/^git\s+clone\s+(?:-b\s+(\S+)\s+)?(?:https?:\/\/)?(\w+\.\w+)\/([^\/\s]+)\/([^\s]+?)(?:\s+(\S+))?\s*$/);
  if(!m) return false;
  var host = m[2], owner = m[3], repo = m[4].replace(/\.git$/, ''), branch = m[1] || '', dest = m[5] || '';
  var h = VM.git.hosts[host];
  if(!h){ VM.say("fatal: unsupported host '" + host + "'\n"); emu.serial0_send("\n"); return true }
  VM.git.clone(emu, h, owner, repo, branch, dest);
  return true;
};

VM.git.clone = async function(emu, host, owner, repo, branch, dest){
  dest = dest || '/root/' + repo;
  if(dest.charAt(0) !== '/') dest = '/root/' + dest;

  VM.say("Cloning into '" + dest.split('/').pop() + "'...\n");

  try {
    var branches = branch ? [branch, 'main', 'master'] : ['main', 'master'];
    var tree, used;
    for(var i = 0; i < branches.length; i++){
      var url = host.tree(owner, repo, branches[i]);
      var res = await fetch(url, { headers: host.auth() });
      if(res.ok){
        var data = await res.json();
        tree = host.parse ? host.parse(data) : (data.tree || []);
        used = branches[i];
        break;
      }
      if(res.status === 403) throw Error('API rate limit exceeded');
    }
    if(!tree) throw Error("repository '" + owner + '/' + repo + "' not found");

    var files = tree.filter(f => f.type === 'blob');
    var dirs = tree.filter(f => f.type === 'tree');
    var total = files.length;

    VM.say("remote: " + tree.length + " objects\n");

    VM.fs.dir(emu, dest);
    dirs.forEach(d => VM.fs.dir(emu, dest + '/' + d.path));

    var done = 0;
    for(var j = 0; j < files.length; j += 8){
      var batch = files.slice(j, j + 8);
      await Promise.all(batch.map(async (f) => {
        var url = host.raw(owner, repo, used, f.path);
        var r = await fetch(url, { headers: host.auth() });
        if(!r.ok){ VM.say("skip " + f.path + "\n"); return }
        await VM.fs.put(emu, dest + '/' + f.path, new Uint8Array(await r.arrayBuffer()));
        done++;
        if(done % 25 === 0 || done === total) VM.say("\r" + Math.round(done/total*100) + "% (" + done + "/" + total + ")");
      }));
    }
    VM.say("\ndone.\n");
    emu.serial0_send("ls " + dest + "\n");
  } catch(e){
    VM.say("fatal: " + e.message + "\n");
    emu.serial0_send("\n");
  }
};

// --- package install ---

VM.pkg = {};

// npm
VM.pkg.npm = {};
VM.pkg.npm.got = {};

VM.pkg.npm.run = function(cmd, emu){
  var m = cmd.match(/^npm\s+install\s+(.+)/);
  if(!m) return false;
  VM.pkg.npm.exec(m[1].trim().split(/\s+/), emu);
  return true;
};

VM.pkg.npm.exec = async function(names, emu){
  VM.pkg.npm.got = {};
  var base = '/root', t = Date.now();
  VM.say("npm install " + names.join(' ') + "\n");
  for(var i = 0; i < names.length; i++){
    var raw = names[i].replace(/^--.*/, '');
    if(!raw) continue;
    var at = raw.lastIndexOf('@');
    var name = at > 0 ? raw.slice(0, at) : raw;
    var ver = at > 0 ? raw.slice(at + 1) : 'latest';
    try { await VM.pkg.npm.one(name, ver, emu, 0, base) }
    catch(e){ VM.say("ERR " + e.message + "\n") }
  }
  var n = Object.keys(VM.pkg.npm.got).length;
  VM.say("added " + n + " packages in " + ((Date.now() - t) / 1000).toFixed(1) + "s\n");
  emu.serial0_send("echo done\n");
};

VM.pkg.npm.one = async function(name, ver, emu, depth, base){
  if(VM.pkg.npm.got[name]) return;
  VM.pkg.npm.got[name] = 1;
  var pad = '  '.repeat(depth || 0);

  try {
    var res = await fetch("https://registry.npmjs.org/" + name + "/latest");
    if(!res.ok) res = await fetch("https://registry.npmjs.org/" + name);
    if(!res.ok) return;
    var meta = await res.json();
    ver = meta.version || (meta['dist-tags'] || {}).latest;
    if(!ver) return;
  } catch(e){ return }

  VM.say(pad + "+ " + name + "@" + ver + "\n");

  var tree = await fetch("https://data.jsdelivr.com/v1/packages/npm/" + name + "@" + ver);
  if(!tree.ok) return;
  var files = [];
  var flat = (arr, pre) => {
    (arr||[]).forEach(f => {
      var p = pre + '/' + f.name;
      if(f.type === 'directory') flat(f.files, p);
      else files.push(p);
    });
  };
  flat((await tree.json()).files, '');

  var dest = base + '/node_modules/' + name;
  VM.fs.dir(emu, dest);

  for(var j = 0; j < files.length; j += 12){
    var batch = files.slice(j, j + 12);
    await Promise.all(batch.map(async (f) => {
      try {
        var r = await fetch("https://cdn.jsdelivr.net/npm/" + name + "@" + ver + f);
        if(!r.ok) return;
        await VM.fs.put(emu, dest + f, new Uint8Array(await r.arrayBuffer()));
      } catch(e){}
    }));
  }

  var deps = Object.keys(meta.dependencies || {});
  for(var k = 0; k < deps.length; k++){
    await VM.pkg.npm.one(deps[k], 'latest', emu, (depth||0) + 1, base);
  }
};

// pip
VM.pkg.pip = {};

VM.pkg.pip.run = function(cmd, emu){
  var m = cmd.match(/^pip\s+install\s+(.+)/);
  if(!m) return false;
  VM.pkg.pip.exec(m[1].trim().split(/\s+/), emu);
  return true;
};

VM.pkg.pip.exec = async function(names, emu){
  VM.say("pip install " + names.join(' ') + "\n");
  for(var i = 0; i < names.length; i++){
    var name = names[i].replace(/^--.*/, '');
    if(!name) continue;
    try {
      var res = await fetch("https://pypi.org/pypi/" + name + "/json");
      if(!res.ok){ VM.say("ERR: package '" + name + "' not found\n"); continue }
      var meta = await res.json();
      var ver = meta.info.version;
      // find pure-python wheel or sdist
      var urls = (meta.urls || []).filter(u => u.packagetype === 'bdist_wheel' && u.filename.includes('none-any'));
      if(!urls.length) urls = (meta.urls || []).filter(u => u.packagetype === 'sdist');
      if(!urls.length){ VM.say("ERR: no compatible dist for " + name + "\n"); continue }
      VM.say("+ " + name + "@" + ver + " (pure-python only)\n");
      // TODO: download and extract wheel/sdist into /usr/lib/python3/
      VM.say("note: pip install via browser is experimental\n");
    } catch(e){ VM.say("ERR " + e.message + "\n") }
  }
  emu.serial0_send("\n");
};

// apk
VM.pkg.apk = {};

VM.pkg.apk.run = function(cmd, emu){
  VM.say("apk add: not yet wired to a CORS mirror\n");
  VM.say("to add packages, rebuild the VM image\n");
  emu.serial0_send("\n");
  return true;
};

// --- server proxy ---

VM.srv = {};
VM.srv.ports = {};
VM.srv.pending = {};

VM.srv.patterns = [
  /listening on (?:port )?(\d+)/i,
  /server (?:running|started) (?:on|at) .*?:(\d+)/i,
  /http:\/\/(?:localhost|0\.0\.0\.0|127\.0\.0\.1):(\d+)/i,
];

VM.srv.scan = function(out){
  for(var i = 0; i < VM.srv.patterns.length; i++){
    var m = out.match(VM.srv.patterns[i]);
    if(m && m[1]){
      var port = m[1];
      if(VM.srv.ports[port]) return;
      VM.srv.ports[port] = { at: Date.now() };
      kit.say({name: 'port:' + port, prompt: 'open ' + port}, 'belt');
      kit.say('Server on port ' + port, 'help');
    }
  }
};

VM.srv.fetch = function(port, path){
  if(!VM.emu || !VM.ready) return Promise.resolve('VM not ready');
  var id = Math.random().toString(36).slice(2, 8);
  var cmd = 'echo ===H' + id + '=== && nc -w 2 127.0.0.1 ' + port + '; echo; echo ===E' + id + '===\n';
  VM.emu.serial0_send(cmd);
  return new Promise((ok) => {
    VM.srv.pending[id] = ok;
    setTimeout(() => {
      if(VM.srv.pending[id]){
        delete VM.srv.pending[id];
        ok('timeout: no response from port ' + port);
      }
    }, 10000);
  });
};

// In-process OPFS fixture + Node worker_threads Lifo guest (not browser E2E).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {Worker} = require('worker_threads');
const {pathToFileURL} = require('url');

const ROOT = path.resolve(__dirname, '..');
const BUNDLE = '/workspace/runtimebench/lifo.esm.bundle.mjs';
assert(fs.existsSync(BUNDLE), 'retained Lifo bundle required for Node runtime test');
assert(fs.existsSync(path.join(ROOT, 'vm/pod/wrun.js')), 'wrun.js guest realm required');

function memOpfs(){
  var tree = {};
  function parts(p){ return String(p || '').split('/').filter(Boolean) }
  function node(p, make){
    var cur = tree, all = parts(p), i;
    for(i = 0; i < all.length; i++){
      if(!cur[all[i]]){
        if(!make) return null;
        cur[all[i]] = {kind: 'directory', kids: {}};
      }
      if(i === all.length - 1) return cur[all[i]];
      if(cur[all[i]].kind !== 'directory') return null;
      cur = cur[all[i]].kids;
    }
    return {kind: 'directory', kids: cur};
  }
  return {
    root: {},
    init: async function(){},
    mkdirp: async function(p){
      var all = parts(p), cur = tree, i;
      for(i = 0; i < all.length; i++){
        if(!cur[all[i]]) cur[all[i]] = {kind: 'directory', kids: {}};
        cur = cur[all[i]].kids;
      }
    },
    write: async function(p, data){
      var all = parts(p), name = all.pop(), cur = tree, i;
      for(i = 0; i < all.length; i++){
        if(!cur[all[i]]) cur[all[i]] = {kind: 'directory', kids: {}};
        cur = cur[all[i]].kids;
      }
      var buf = data instanceof ArrayBuffer ? new Uint8Array(data)
        : data instanceof Uint8Array ? data
        : new TextEncoder().encode(String(data == null ? '' : data));
      cur[name] = {kind: 'file', data: buf};
    },
    read: async function(p){
      var n = node(p, 0);
      if(!n || n.kind !== 'file') throw Error('missing ' + p);
      return n.data.buffer.slice(n.data.byteOffset, n.data.byteOffset + n.data.byteLength);
    },
    exists: async function(p){
      if(!parts(p).length) return {kind: 'directory'};
      var n = node(p, 0);
      return n ? {kind: n.kind} : null;
    },
    list: async function(p){
      var n = !parts(p).length ? {kids: tree} : node(p, 0);
      if(!n || n.kind === 'file') return [];
      return Object.keys(n.kids || n).map(function(name){
        var kid = (n.kids || n)[name];
        return {name: name, kind: kid.kind};
      });
    },
    rm: async function(p, deep){
      var all = parts(p), name = all.pop(), cur = tree, i;
      for(i = 0; i < all.length; i++){
        if(!cur[all[i]]) return;
        cur = cur[all[i]].kids;
      }
      delete cur[name];
    }
  };
}

function loadPod(extra){
  var opfs = memOpfs();
  var pushed = [];
  var ctx = {
    console: console,
    document: {createElement: function(){ return {} }, head: {pin: function(){}}},
    window: {},
    location: {href: pathToFileURL(path.join(ROOT, 'vm/demo.js')).href},
    localStorage: {setItem: function(){}, getItem: function(){ return null }},
    demo: {
      base: pathToFileURL(path.join(ROOT, 'vm') + '/').href,
      home: '/home/user',
      cwd: '/home/user',
      rev: 1,
      opfs: opfs,
      fs: {},
      pod: {},
      path: {tip: function(){ return '~ $ ' }},
      pty: {on: '', off: ''},
      push: function(s){ pushed.push(String(s)) }
    },
    Promise: Promise,
    fetch: global.fetch,
    URL: URL,
    Blob: Blob,
    Worker: function(spec, opt){
      // Map browser module Worker → Node worker_threads running the same wrun.js.
      var url = pathToFileURL(path.join(ROOT, 'vm/pod/wrun.js')).href;
      var w = new Worker(new URL(url), {type: 'module'});
      var bus = {
        postMessage: function(msg){ w.postMessage(msg) },
        terminate: function(){ w.terminate() },
        onmessage: null,
        onerror: null
      };
      w.on('message', function(msg){ if(bus.onmessage) bus.onmessage({data: msg}) });
      w.on('error', function(err){ if(bus.onerror) bus.onerror(err) });
      return bus;
    },
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder,
    Uint8Array: Uint8Array,
    ArrayBuffer: ArrayBuffer,
    Object: Object,
    String: String,
    Error: Error,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };
  ctx.window = ctx;
  if(extra) Object.assign(ctx, extra);
  vm.createContext(ctx);
  ['core.js','fs.js','term.js','lifo.js','boot.js','run.js'].forEach(function(name){
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'vm/pod', name), 'utf8'), ctx, {filename: name});
  });
  return {ctx: ctx, pushed: pushed, opfs: opfs};
}

(async function(){
  var loaded = loadPod();
  var ctx = loaded.ctx;
  var pod = ctx.demo.pod;
  assert.strictEqual(pod.via, 'lifo', 'Lifo is the comment-line default');
  assert(pod.hash && Object.keys(pod.hash).length === 5, 'Nodepod pins remain for restore');
  assert.strictEqual(pod.lifo.url.indexOf('https://esm.sh/@lifo-sh/core@0.10.29/'), 0);
  assert(/^sha384-/.test(pod.lifo.sri));

  // Use local retained bundle as SRI-equivalent src (Node fetch integrity not required here).
  var local = pathToFileURL(BUNDLE).href;
  var realCdn = pod.lifo.cdn;
  pod.lifo.cdn = function(){
    if(pod.lifo.blob) return Promise.resolve(pod.lifo.blob);
    if(pod.lifo.net) return pod.lifo.net;
    pod.lifo.net = Promise.resolve(local).then(function(href){
      pod.lifo.blob = href;
      return href;
    });
    return pod.lifo.net;
  };
  // Dedup in-flight
  var a = pod.lifo.cdn(), b = pod.lifo.cdn();
  assert.strictEqual(a, b, 'cdn dedups in-flight promise');
  await a;

  var got = await pod.prep();
  assert(got && got.fs, 'prep returns pod.pod');
  assert.strictEqual(got, pod.pod);
  assert(pod.term && pod.tty, 'term + tty ready');

  await pod.seed();
  assert(pod.sown, 'seed marks sown');

  // Binary write/read through facade
  var bytes = new Uint8Array([9,8,7,6]);
  await pod.pod.fs.mkdir('/home/user/bin', {recursive: true});
  await pod.pod.fs.writeFile('/home/user/bin/x.bin', bytes);
  var back = await pod.pod.fs.readFile('/home/user/bin/x.bin');
  assert(back instanceof Uint8Array, 'readFile returns bytes');
  assert.deepStrictEqual(Array.from(back), [9,8,7,6]);

  // Watch + command + copy cycle
  pod.on = 1;
  pod.watch();
  await new Promise(function(ok){ setTimeout(ok, 30) });
  await pod.pod.fs.writeFile('/home/user/note.txt', 'hi');
  // Allow watch → save → drain
  await new Promise(function(ok){ setTimeout(ok, 700) });
  var disk = await ctx.demo.opfs.exists('/home/user/note.txt');
  assert(disk && disk.kind === 'file', 'watch/copy restored note.txt into OPFS fixture');

  // cwd persists across commands (cd then pwd)
  var out = [];
  var wasWrite = pod.tty.write;
  pod.mute = 0;
  pod.tty.write = function(s){ out.push(String(s)); wasWrite.call(this, s) };
  await new Promise(function(yes){
    pod.yes = yes;
    pod.term.input('cd /tmp\r');
  });
  out = [];
  await new Promise(function(yes){
    pod.yes = yes;
    pod.term.input('pwd\r');
  });
  var text = out.join('');
  assert(/\/tmp/.test(text), 'pwd after cd uses persisted cwd: ' + text);
  assert.strictEqual(ctx.demo.cwd, '/tmp', 'demo.cwd tracks Lifo cwd');

  // env persists
  out = [];
  await new Promise(function(yes){
    pod.yes = yes;
    pod.term.input('export LIFO_TEST=1\r');
  });
  out = [];
  await new Promise(function(yes){
    pod.yes = yes;
    pod.term.input('echo LIFO_TEST=$LIFO_TEST\r');
  });
  assert(/LIFO_TEST=1/.test(out.join('')), 'export persists across runs: ' + out.join(''));

  // status + prompt: tip restores idle
  assert(pod.idle, 'tip leaves shell idle after command');

  // cancellation
  out = [];
  var runDone = new Promise(function(yes){ pod.yes = yes });
  pod.term.input('sleep 2\r');
  await new Promise(function(ok){ setTimeout(ok, 50) });
  pod.term.input(String.fromCharCode(3));
  await runDone;
  // After cancel, another command still works
  out = [];
  await new Promise(function(yes){
    pod.yes = yes;
    pod.term.input('echo after-cancel\r');
  });
  assert(/after-cancel/.test(out.join('')), 'command works after Ctrl-C');

  // queue ownership: second line waits
  out = [];
  var first = new Promise(function(yes){ pod.yes = yes });
  pod.term.input('sleep 0.2\r');
  pod.term.input('echo queued\r');
  await first;
  // first tip from sleep; wait for queued
  await new Promise(function(yes){ pod.yes = yes });
  assert(/queued/.test(out.join('')), 'queued command runs after busy: ' + out.join(''));

  // Path escape rejected by safe()
  assert.strictEqual(pod.lifo.safe('../etc/passwd'), '');
  assert.strictEqual(pod.lifo.safe('/etc/passwd'), '');
  assert.strictEqual(pod.lifo.safe('ok/file.txt'), 'ok/file.txt');

  // Nodepod selector still intact
  pod.via = 'nodepod';
  assert.strictEqual(pod.via, 'nodepod');
  pod.via = 'lifo';

  // Teardown
  await pod.stop();
  assert(!pod.on, 'stopped');
  assert(!pod.lifo.bus, 'worker cleared');

  // Retry prep after teardown
  var again = await pod.prep();
  assert(again && again.fs, 'prep retries after die');
  await pod.stop();

  console.log('PASS lifo worker_threads prep→seed→watch→cmd→copy; cwd/env/cancel/queue/teardown');
})().catch(function(err){
  console.error(err);
  process.exit(1);
});

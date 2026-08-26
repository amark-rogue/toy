const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

var out = [];
var ctx = {
  console: console,
  location: {},
  localStorage: {getItem: function(){ return null }, setItem: function(){}},
  navigator: {},
  screen: {},
  sign: {},
  host: {value: '', addEventListener: function(){}, ear: function(){}},
  cop: {sign: function(){}},
  kit: {say: function(){}, ear: function(){}},
  document: {
    currentScript: {src: 'http://toy/vm/demo.js'},
    createElement: function(){ return {setAttribute: function(){}} },
    head: {pin: function(s){ setTimeout(function(){ if(s.onerror) s.onerror() }, 0) }}
  },
  fetch: async function(url){
    if(url.indexOf('/git/trees/') >= 0){
      return {ok: true, json: async function(){
        return {tree: [{path: 'index.html', type: 'blob'}]};
      }};
    }
    return {ok: true, arrayBuffer: async function(){
      return new TextEncoder().encode('ok').buffer;
    }};
  },
  TextDecoder: TextDecoder,
  TextEncoder: TextEncoder,
  Uint8Array: Uint8Array,
  URL: URL,
  Promise: Promise,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
ctx.window = ctx;
vm.createContext(ctx);

var run = function(file){
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, {filename: file});
};

run('vm/boot.js');
run('vm/demo.js');
run('vm/pod/core.js');
run('vm/pod/fs.js');
run('vm/pod/term.js');
run('vm/pod/boot.js');
run('vm/pod/run.js');
ctx.demo.pod.ok = 1;
run('vm/git.js');
run('vm/js/help.js');

assert(!/\baid\b/.test(fs.readFileSync('vm/demo.js', 'utf8')), 'demo core has no knowledge of optional commands');
assert(!/\baid\b/.test(fs.readFileSync('vm/pod/core.js', 'utf8')), 'pod routing has no command-specific agent exception');

var pick = [], oldvm = ctx.VM.boot, olddemo = ctx.demo.boot, oldadd = ctx.demo.pod.add, oldsign = ctx.cop.sign;
ctx.VM.boot = function(){ pick.push('vm') };
ctx.demo.boot = function(){ pick.push('demo') };
ctx.demo.pod.add = async function(){};
ctx.cop.sign = function(){ pick.push('ssh') };
var hosttest = (async function(){
  ctx.host.value = 'vm'; await ctx.sign.onsubmit({preventDefault:function(){}});
  ctx.host.value = 'demo'; await ctx.sign.onsubmit({preventDefault:function(){}});
  ctx.host.value = 'ssh://host'; await ctx.sign.onsubmit({preventDefault:function(){}});
  assert.deepStrictEqual(pick, ['vm','demo','ssh'], 'vm, demo, and SSH selections retain their own submit paths');
  ctx.VM.boot = oldvm; ctx.demo.boot = olddemo; ctx.demo.pod.add = oldadd; ctx.cop.sign = oldsign;
}());

var serial = [], frame = '', ready = ctx.VM.ready, routes = ctx.VM.cmd.routes;
ctx.VM.ready = true; ctx.VM.cmd.routes = [];
var vmws = ctx.VM.shim({serial0_send:function(raw){ serial.push(raw) }});
vmws.send('{"#":"31","$":"pwd\\r"}');
assert.deepStrictEqual(serial, ['pwd\r'], 'VM shim unwraps a task command instead of executing its JSON envelope');
ctx.VM.io.say(function(raw){ frame = raw }, '/root\r\n$ ');
assert.deepStrictEqual(JSON.parse(frame), {'#':'31','$':'/root\r\n$ '}, 'VM output retains the task id');
vmws.send('{"size":{"cols":82,"rows":37}}');
assert.strictEqual(serial.length, 1, 'VM resize metadata is not typed into the shell');
vmws.send('echo bare');
assert.strictEqual(ctx.VM.io.id, '', 'a plain host command clears stale task routing');
ctx.VM.ready = ready; ctx.VM.cmd.routes = routes;

var page = fs.readFileSync('app.html', 'utf8');
assert(page.indexOf('type="importmap"') < 0, 'app does not eagerly declare the pod import map');
var map = ctx.demo.pod.hash;
var urls = Object.keys(map);
assert.strictEqual(urls.length, 5, 'every Nodepod runtime module is integrity-pinned');
urls.forEach(function(url){
  assert(url.indexOf('https://cdn.jsdelivr.net/npm/@scelar/nodepod@1.9.20/dist/') === 0,
    'Nodepod CDN URL pins the exact package version');
  assert(/^sha384-[A-Za-z0-9+/]{64}$/.test(map[url]), 'Nodepod module has a SHA-384 hash');
});
var boot = fs.readFileSync('vm/pod/boot.js', 'utf8');
assert(boot.indexOf('s.integrity = pod.hash[pod.url]') >= 0,
  'the CDN entry also uses a script integrity attribute');
assert(boot.indexOf('import(pod.url)') >= 0, 'the verified entry needs no local module bridge');

ctx.demo.opfs.root = {};
ctx.demo.opfs.chain = Promise.resolve();
ctx.demo.opfs.mkdirp = async function(){};
ctx.demo.opfs.write = async function(){};
ctx.demo.ok = 1;
ctx.demo.tipped = 0;
ctx.demo.job = Promise.resolve();
ctx.demo.say = function(s){ out.push(s) };
ctx.demo.wire();

var ws = ctx.demo.shim();
ws.send('ls .\r');
ws.send('git clone https://github.com/acme/toy\r');
ws.send('help\r');

var wait = async function(){
  var was;
  do{
    was = ctx.demo.job;
    await was;
    await new Promise(function(ok){ setTimeout(ok, 0) });
  }while(was !== ctx.demo.job);
};

wait().then(async function(){
  await hosttest;
  var got = out.join('');
  var real = fs.readFileSync('test/samples/darwin-arm64_user-log.txt', 'utf8');
  var git = got.indexOf('~ $ git clone https://github.com/acme/toy\r\n');
  var done = got.search(/done\.\r\n(?:\x1b\[\?2004h)?~ \$ /);
  var help = got.indexOf('~ $ help\r\n');
  assert(git >= 0, 'clone command is echoed after a prompt');
  assert(done > git, 'clone output ends on its own prompt');
  assert(help > done, 'the next command waits for clone and its prompt');
  assert(!/[^\r]\n/.test(got), 'demo uses PTY CRLF line endings');
  assert(/\$ [^\r\n]+\r\n/.test(real), 'real PTY echoes commands after prompts');
  assert(/\$ [^\r\n]+\r\n/.test(got), 'demo matches real PTY command boundaries');
  assert(/~ \$ $/.test(got), 'the transcript ends at a prompt');
  assert(!/~ \$ ~ \$/.test(got), 'demo never stacks two tips on one line');
  assert(got.indexOf('\x1b[?2004h') >= 0, 'demo frames prompts like a real PTY');
  assert(got.indexOf('\x1b[?2004l') >= 0, 'demo turns paste mode off after a command');
  global.HTMLElement = global.HTMLElement || function(){};
  global.HTMLElement.prototype = global.HTMLElement.prototype || {};
  global.NodeList = global.NodeList || function(){};
  global.NodeList.prototype = global.NodeList.prototype || {};
  global.document = global.document || {createElement: function(){ return {} }, querySelectorAll: function(){ return [] }, addEventListener: function(){}, body: {addEventListener: function(){}}};
  global.window = global.window || {Tool: {}};
  global.Tool = global.Tool || {};
  global.screen = global.screen || {};
  global.navigator = global.navigator || {};
  eval(fs.readFileSync('util.js', 'utf8'));
  var bits = String.prompts(got);
  var cmds = bits.map(function(c){ return c.cmd() }).filter(Boolean);
  assert(cmds.indexOf('git clone https://github.com/acme/toy') >= 0, 'splitter sees the clone command');
  assert(cmds.indexOf('help') >= 0, 'splitter sees help after clone');
  assert(cmds.every(function(c){ return 0 !== c.indexOf('~ $') }), 'no unit keeps a stacked tip as its command');

  var routed = [];
  ctx.demo.say = function(s){ routed.push(JSON.parse(s)) };
  ctx.demo.jobs = {};
  ctx.demo.id = '';
  ctx.demo.tipped = ctx.demo.at = 0;
  ws.send('{"#":"21","$":"help\\r"}');
  await wait();
  assert(routed.length > 1, 'a new demo task receives its opening prompt and result');
  assert(routed.every(function(one){ return '21' === one['#'] }), 'demo output retains its task id');
  assert(0 <= routed.map(function(one){ return one.$ }).join('').indexOf('~ $ help\r\n'), 'new demo task has a parseable prompt boundary');

  ctx.Worker = function(){};
  assert(!ctx.demo.pod.use('ls .'), 'small commands keep the instant demo path');
  assert(ctx.demo.pod.use('node hello.js'), 'node selects the richer browser shell');
  assert(ctx.demo.pod.use('echo one | wc -w'), 'pipes select the richer browser shell');
  assert(ctx.demo.pod.use('grep one file'), 'missing POSIX tools select the richer browser shell');

  var podin = [], clone = 0, was = ctx.VM.git.run;
  ctx.demo.pod.on = 1;
  ctx.demo.pod.term = {input: function(s){ podin.push(s) }};
  ctx.VM.git.run = function(){ clone += 1; return true };
  ws.send('{"#":"22","$":"git clone https://github.com/acme/toy\\r"}');
  await wait();
  ctx.VM.git.run = was;
  ctx.demo.pod.on = 0;
  assert.strictEqual(clone, 1, 'git clone keeps the explicit VM route when Nodepod is live');
  assert.deepStrictEqual(podin, [], 'Nodepod never receives a routed clone');

  var frame = [];
  var fix = JSON.parse(fs.readFileSync('test/samples/shelltask.json', 'utf8'));
  ctx.demo.say = function(s){ frame.push(s) };
  ctx.demo.id = '';
  ctx.demo.pod.mute = 0;
  ctx.demo.pod.cmd = 1;
  var tty = new ctx.demo.pod.Tty();
  tty.write('node -v');
  tty.write('\r\n');
  tty.write('v22.12.0\r\n');
  tty.write(ctx.demo.path.tip());
  assert.strictEqual(frame.join(''), fix.pod, 'Nodepod output matches the shell task fixture');

  var size;
  tty.onResize(function(s){ size = s });
  ctx.demo.pod.size({cols: 91, rows: 31});
  assert.deepStrictEqual(JSON.parse(JSON.stringify(size)), {cols: 91, rows: 31}, 'terminal resize reaches the richer shell');

  var keys = [];
  ctx.demo.pod.on = 1;
  ctx.demo.pod.idle = 0;
  ctx.demo.pod.term = {input: function(s){ keys.push(s) }};
  ws.send('{"#":"9","$":"x"}');
  await wait();
  assert.deepStrictEqual(keys, ['x'], 'task envelopes feed one terminal input');
  ctx.demo.pod.on = 0;
  console.log('PASS demo PTY stream');
}).catch(function(err){
  console.error(err);
  process.exitCode = 1;
});

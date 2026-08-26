const assert = require('assert');
const child = require('child_process');
const fs = require('fs');
const vm = require('vm');

const root = __dirname + '/..';
const sent = [];
const ears = {};
const ctx = {
  console, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, AbortController,
  setTimeout, clearTimeout, Promise, Date, window:null,
  document:{createElement:function(){ return {} }, head:{appendChild:function(){}}},
  kit:{
    say:function(data, type){ sent.push({data, type}) },
    ear:function(type, fn){ ears[type] = fn }
  }, aid:{}
};
ctx.window = ctx; vm.createContext(ctx);
const load = name => vm.runInContext(fs.readFileSync(root + '/' + name, 'utf8'), ctx, {filename:name});
const turn = () => new Promise(resolve => setImmediate(resolve));
const raw = (id, text, code) => {
  const hex = Array.from(Buffer.from(text)).map(one => one.toString(16).padStart(2, '0')).join(' ');
  return 'echoed wrapper\r\n\x1eAID' + id + 'B\x1e\r\n ' + hex + '\r\n\x1eAID' + id + 'E:' + (code || 0) + '\x1e\r\n';
};

load('cmd/aid/host.js');
const H = ctx.aid.host;

assert(H.miss('box$ aid fix it\r\nbash: aid: command not found\r\n'), 'direct SSH command-not-found enables fallback');
assert(H.miss('user@jump$ ssh work\r\nwork% aid inspect\r\nzsh: command not found: aid\r\n'), 'nested SSH command-not-found enables fallback');
assert(H.miss("PS C:\\work> aid inspect\r\naid : The term 'aid' is not recognized as a name of a cmdlet.\r\n"), 'PowerShell command-not-found enables fallback');
assert.strictEqual(H.kind("PS C:\\work> aid inspect\r\naid : The term 'aid' is not recognized as a name of a cmdlet.\r\n"), 'ps');
assert(!H.miss('box$ aid inspect\r\nThe child tool said command not found: rg, so I used find.\r\n'), 'native aid prose does not trigger fallback');
assert.strictEqual(H.ask('user@jump$ ssh work\r\nwork% aid inspect the repo\r\nzsh: command not found: aid\r\n'), 'inspect the repo');
assert.strictEqual(H.ask('box$ cd /srv/app && aid fix tests\r\nbash: aid: command not found\r\n'), 'fix tests');

(async function(){
  H.type = 'ps';
  assert(H.wrap('Get-Location', 'C:\\work', 'ps1').includes('[ScriptBlock]::Create'), 'PowerShell hosts receive their own marked RPC wrapper');
  assert(!H.wrap('Get-Location', 'C:\\work', 'ps2').includes('sh -c'), 'PowerShell fallback never assumes a POSIX child shell');
  H.claim();
  const claim = sent.shift();
  assert(claim && 'term.open' === claim.type && 'shell' === claim.data.mode, 'fallback claims its owning task as a shell-mode stream');
  assert.strictEqual(typeof ears.term, 'function', 'fallback listens for targeted terminal frames');
  H.on = 1; H.type = 'sh';
  const one = H.run('pwd', '/srv/app'); const two = H.run('printf two', '/srv/app');
  await turn();
  assert.strictEqual(sent.length, 1, 'one same-task host command runs at a time');
  assert.strictEqual(sent[0].type, 'host');
  assert.strictEqual(typeof sent[0].data, 'string', 'component sends only marked shell bytes');
  assert(!sent[0].data.includes('"#"'), 'component never invents or changes the owning task id');
  let id = Object.keys(H.wait)[0]; ears.term({detail:raw(id, '/srv/app\n', 0)});
  assert.strictEqual((await one).out, '/srv/app\n');
  await turn();
  assert.strictEqual(sent.length, 2, 'the next tool waits for the same PTY response');
  id = Object.keys(H.wait)[0]; H.take(raw(id, 'two', 0));
  assert.strictEqual((await two).out, 'two');

  const wire = child.execFileSync('/bin/sh', ['-c', H.wrap("printf '%s\\n' 'hello host'\nprintf tail", process.cwd(), 'probe')]).toString();
  const a = wire.indexOf('\x1eAIDprobeB\x1e'), z = wire.indexOf('\x1eAIDprobeE:0\x1e');
  assert(a >= 0 && z > a, 'host wrapper has unambiguous begin, bytes, exit, and end evidence');
  assert.strictEqual(new TextDecoder().decode(H.hex(wire.slice(a + 11, z))), 'hello host\ntail');

  const net = H.run; H.run = async function(line){
    return {out:child.execFileSync('/bin/sh', ['-c', line]).toString(), code:0};
  };
  assert.strictEqual((await H.hit(process.cwd())).kind, 'directory', 'POSIX host kind test executes with valid bracket spacing');
  const lines = []; H.run = async function(line, cwd, secs, safe){ lines.push({line, safe}); return {out:'', code:0} };
  await H.put('/srv/app/large.txt', 'λ'.repeat(2500));
  const body = lines.slice(1).map(one => Buffer.from((one.line.match(/'([A-Za-z0-9+/=]+)'\|base64/) || [])[1] || '', 'base64')).reduce((all, one) => Buffer.concat([all, one]), Buffer.alloc(0));
  assert.strictEqual(body.toString(), 'λ'.repeat(2500), 'large UTF-8 writes are losslessly split below PTY line limits');
  assert(lines.length > 2 && lines.every(one => one.safe && one.line.length < 700), 'host writes use bounded generated shell lines');
  H.run = net;

  let use = [];
  ctx.demo = {
    home:'/home/me', root:'/home/me', cwd:'/home/me/work',
    fs:{exists:function(){ throw Error('OPFS exists used') }, list:function(){ throw Error('OPFS list used') }, read:function(){ throw Error('OPFS read used') }, write:function(){ throw Error('OPFS write used') }},
    opfs:{readText:function(){ throw Error('OPFS store used') }, write:function(){ throw Error('OPFS store used') }, list:function(){ throw Error('OPFS store used') }},
    path:{up:function(path){ return path.replace(/\/?[^/]+\/?$/, '') || '/' }}
  };
  H.hit = async path => (use.push('hit ' + path), {kind:'file'});
  H.list = async path => (use.push('list ' + path), [{kind:'file', name:'one'}]);
  H.read = async path => (use.push('read ' + path), new TextEncoder().encode('host text').buffer);
  H.put = async (path, text) => { use.push('put ' + path + ' ' + text) };
  H.drop = async path => { use.push('drop ' + path) };
  ctx.aid.diff = {note:function(){}};
  load('cmd/aid/disk.js');
  assert.strictEqual(await ctx.aid.disk.text('/home/me/work/a'), 'host text');
  await ctx.aid.disk.write({}, '/home/me/work/a', 'new');
  await ctx.aid.disk.drop('/home/me/work/a');
  assert.deepStrictEqual(use, ['read /home/me/work/a','hit /home/me/work/a','read /home/me/work/a','put /home/me/work/a new','hit /home/me/work/a','drop /home/me/work/a'], 'file tools stay on the selected SSH filesystem');

  use = []; ctx.aid.ctx = {skip:{}};
  H.hit = async path => (use.push('hit ' + path), '/home/me/work/gun/gun.js' === path ? {kind:'file'} : null);
  H.list = async path => {
    use.push('list ' + path);
    if('/home/me/work' === path){ return [{kind:'directory', name:'gun'}] }
    if('/home/me/work/gun' === path){ return [{kind:'file', name:'gun.js'}] }
    return [];
  };
  load('cmd/aid/seek.js');
  var found = await ctx.aid.disk.seek('/home/me/work/gun.js', {cwd:'/home/me/work'});
  assert(found.move && '/home/me/work/gun/gun.js' === found.path, 'path recovery uses the owning SSH filesystem');
  assert(!use.some(one => /OPFS/.test(one)), 'host path recovery never switches to OPFS');

  H.on = 0; ctx.demo.fs.exists = async function(){ return {kind:'file', demo:1} };
  assert.strictEqual((await ctx.aid.disk.hit('/home/me/work/a')).demo, 1, 'demo keeps its own OPFS facade');
  H.on = 1;

  use = []; ctx.aid.disk.text = async path => (use.push('text ' + path), '{"id":"s1"}');
  ctx.aid.disk.put = async (path, text) => { use.push('save ' + path + ' ' + text) };
  ctx.aid.disk.list = async path => (use.push('files ' + path), []);
  load('cmd/aid/store.js'); ctx.aid.store.root = '/home/me/.aid';
  assert.strictEqual((await ctx.aid.store.get('s1', null)).id, 's1');
  await ctx.aid.store.put('s1', {id:'s1'}); await ctx.aid.store.list();
  assert(use.some(one => 0 === one.indexOf('save /home/me/.aid/s1.json')), 'frontend session state also persists on the host, not OPFS');

  ctx.aid.disk.snap = async function(){ return {} }; ctx.aid.disk.chg = async function(){ return 0 };
  ctx.aid.cap = text => '' + text; ctx.aid.emit = function(){}; ctx.aid.use = {};
  H.run = async function(line, cwd){ use.push('shell ' + cwd + ' ' + line); return {out:'remote ok', code:0} };
  ctx.demo.pod = {use:function(){ throw Error('demo pod used') }}; ctx.demo.cmd = {run:function(){ throw Error('demo command used') }};
  load('cmd/aid/sh.js');
  assert.strictEqual(await ctx.aid.use.sh({line:'git status'}, {cwd:'/home/me/work', ctl:new AbortController()}, {id:'c1'}), 'remote ok');
  assert(use.some(one => 'shell /home/me/work git status' === one), 'shell tool runs in the actual host working folder');

  console.log('PASS aid direct SSH fallback, nested SSH authority, host files, and demo isolation');
}()).catch(function(err){ console.error(err); process.exitCode = 1 });

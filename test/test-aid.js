const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

var out = [], belt = [], talk = [];
var bag = {}; // fake disk
var sent = [];

var lS = {
  aikey: '', aipro: '', aipi: '', aimodel: '',
  getItem: function(k){ return null == this[k] ? null : this[k] },
  setItem: function(k, v){ this[k] = v }
};
lS.setItem('demo.cwd', '/root');

var ctx = {
  console: console,
  location: {},
  localStorage: lS,
  navigator: {},
  screen: {},
  sign: {},
  host: {value: '', addEventListener: function(){}},
  cop: {sign: function(){}},
  kit: {say: function(d, e){
    var o;
    if('belt' === e){ belt.push(d) }
    if('chat' === e && '{' === ('' + d).charAt(0)){
      try{ o = JSON.parse(d); if(o.say){ talk.push(o.say) } }catch(e){}
    }
  }, ear: function(){}},
  document: {
    currentScript: {src: 'http://toy/aid/aid.js'},
    createElement: function(){ return {} },
    head: {appendChild: function(s){ setTimeout(function(){ if(s.onload) s.onload() }, 0) }}
  },
  fetch: async function(url){
    if(0 <= url.indexOf('ch.at')){ return {ok: false, status: 429, statusText: 'busy'} }
    return {ok: true, status: 200, json: async function(){
      return {choices: [{message: {content: 'hello from ollama'}}]};
    }};
  },
  TextDecoder: TextDecoder,
  TextEncoder: TextEncoder,
  Promise: Promise,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  CustomEvent: function(){},
  Error: Error,
  JSON: JSON,
  Object: Object,
  RegExp: RegExp
};
ctx.window = ctx;
vm.createContext(ctx);

var run = function(file){
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, {filename: file});
};

run('vm/boot.js');
run('vm/demo.js');
run('vm/pod/core.js');
run('aid/aid.js');

// one route, exact word, riding after cd .. && like real tasks do
assert(ctx.VM.cmd.routes.some(function(r){ return r.match.test('aid fix app.css') }), 'route takes aid tasks');
assert(ctx.VM.cmd.routes.some(function(r){ return r.match.test('cd ~ && aid fix app.css') }), 'route takes inherited cd chains');
assert(ctx.VM.cmd.routes.some(function(r){ return r.match.test('ls; aid fix app.css') }), 'route takes semicolon chains');
assert(!ctx.VM.cmd.routes.some(function(r){ return r.match.test('aidx') }), 'route skips words that start with aid');
assert(!ctx.VM.cmd.routes.some(function(r){ return r.match.test('maiden voyage') }), 'route skips words containing aid');

run('aid/key.js');
run('aid/net.js');
run('aid/use.js');
run('aid/run.js');

// provider detect from pasted keys
assert.strictEqual(ctx.aid.pick('sk-or-v1abc'), 'router');
assert.strictEqual(ctx.aid.pick('sk-ant-api03x'), 'anthropic');
assert.strictEqual(ctx.aid.pick('gsk_abc'), 'groq');
assert.strictEqual(ctx.aid.pick('sk-projabc'), 'openai');
assert.strictEqual(ctx.aid.pick(''), '', 'no key means free chain');

// free chain first without a key, chosen provider first, free tail after any failure
ctx.localStorage.aikey = '';
ctx.localStorage.aipro = '';
assert.strictEqual(ctx.aid.chain().join(' '), 'chat ollama');
ctx.localStorage.aikey = 'sk-or-v1abc';
assert.strictEqual(ctx.aid.chain().join(' '), 'router chat ollama');
ctx.localStorage.aipro = 'groq';
assert.strictEqual(ctx.aid.chain().join(' '), 'groq chat ollama');

// scan: fenced json, bare json, json after prose, braces in strings
assert.deepStrictEqual(ctx.aid.scan('```json\n{"tool":"read","path":"a"}\n```'), {tool: 'read', path: 'a'});
assert.deepStrictEqual(ctx.aid.scan(' {"tool":"find","word":"x"} '), {tool: 'find', word: 'x'});
var mixed = "Let me look first.\n\n{\"tool\":\"read\",\"path\":\".\"}";
var got = ctx.aid.scan(mixed);
assert.deepStrictEqual(got, {tool: 'read', path: '.'}, 'prose before a bare tool still parses');
assert.strictEqual(ctx.aid.note, 'Let me look first.', 'the intent line is kept for display');
var nested = '{"tool":"save","path":"a.js","text":"function f(){ return {x:1} } // \\"q\\""}';
got = ctx.aid.scan(nested);
assert.strictEqual(got.tool, 'save', 'braces and quotes inside save body survive');
assert(/return \{x:1\}/.test(got.text), 'nested braces land intact');
assert.strictEqual(ctx.aid.scan('plain answer'), null);
assert.strictEqual(ctx.aid.scan('```\nnot json\n```'), null);
assert.strictEqual(ctx.aid.scan('{"noname":1}'), null);
assert.strictEqual(ctx.aid.scan(''), null);

// key command: show, paste detect, pin, free
(async function(){
  var said = [], real = ctx.aid.say;
  ctx.aid.say = function(text){ said.push(text) };
  ctx.localStorage.aikey = '';
  ctx.localStorage.aipro = '';
  await ctx.aid.task('');
  assert(/usage: aid /.test(said.join('\n')), 'empty ask prints usage');

  said = [];
  await ctx.aid.task('key');
  var show = said.join('');
  assert(/provider: chat/.test(show), 'status names the starting provider');
  assert(/ch.at|free/.test(show), 'status mentions the free chain');

  said = [];
  await ctx.aid.task('key sk-ant-api03xyz');
  assert(/key saved: anthropic/.test(said.join('')), 'paste detects its provider');
  assert.strictEqual(lS.aikey, 'sk-ant-api03xyz', 'paste is stored');

  said = [];
  await ctx.aid.task('key groq');
  assert(/provider: groq/.test(said.join('')), 'pin by name reports');
  assert.strictEqual(lS.aipro, 'groq', 'pin is stored');

  said = [];
  await ctx.aid.task('key free');
  assert(/free chain on/.test(said.join('')), 'free resets');
  assert(!lS.aikey, 'free clears the key');
  assert(!lS.aipro, 'free clears the pin');

  // fallback: ch.at busy, ollama answers
  ctx.localStorage.aikey = '';
  var got = await ctx.aid.call([{role: 'user', content: 'hi'}]);
  assert.strictEqual(got, 'hello from ollama', 'a failed try falls to the next free name');
  assert.strictEqual(ctx.aid.hit, 'ollama', 'the winner is remembered');

  // full task on the real route: read folder, save file, then prose
  ctx.aid.say = real;
  var ids = [];
  ctx.demo.opfs.root = {};
  ctx.demo.opfs.chain = Promise.resolve();
  ctx.demo.opfs.exists = async function(path){
    var abs = ctx.demo.path.abs(path);
    if('/root' === abs){ return {kind: 'directory'} }
    return bag[abs] ? {kind: 'file'} : null;
  };
  ctx.demo.opfs.list = async function(){
    return [{name: 'app.css', kind: 'file'}];
  };
  ctx.demo.opfs.readText = async function(path){
    return bag[ctx.demo.path.abs(path)] || '';
  };
  ctx.demo.opfs.write = async function(path, text){
    bag[ctx.demo.path.abs(path)] = '' + text;
  };
  ctx.demo.opfs.mkdirp = async function(){};
  ctx.demo.ok = 1;
  ctx.demo.tipped = 0;
  ctx.demo.job = Promise.resolve();
  ctx.demo.say = function(s){
    if('{' === String(s).charAt(0)){
      try{
        s = JSON.parse(s);
        ids.push(s['#']);
        out.push(s.$);
        return;
      }catch(e){}
    }
    ids.push('');
    out.push(s);
  };
  ctx.demo.wire();

  var plays = [
    '```json\n{"tool":"read","path":"."}\n```',
    '```json\n{"tool":"save","path":"hi.txt","text":"hi"}\n```',
    'Saved hi.txt with one line. All done.'
  ];
  ctx.aid.call = async function(){ return plays.shift() };

  var ws = ctx.demo.shim();
  ws.send('{"#":"7","$":"aid put hi in hi.txt\\r"}');

  var was;
  do{
    was = ctx.demo.job;
    await was;
    await new Promise(function(ok){ setTimeout(ok, 0) });
  }while(was !== ctx.demo.job);

  var got2 = out.join('');
  var idok = ids.length > 1 && ids.every(function(one){ return '7' === one });
  assert(idok, 'streamed chunks keep their task id');
  assert(/aid put hi in hi\.txt\r\n/.test(got2), 'route echo lands once, owned by the prompt');
  assert(/\x1b\[\?2004h~ \$ $/.test(got2), 'frame closes on its own prompt');
  assert(!/[^\r]\n/.test(got2), 'only PTY CRLF endings');
  assert(talk.join('\n').indexOf('(read .)') >= 0, 'tool steps stream as they happen');
  assert(talk.join('\n').indexOf('(save hi.txt)') >= 0, 'save step streams too');
  assert(/All done\./.test(talk.join('')), 'final prose streams');
  assert(bag['/root/hi.txt'] === 'hi', 'save wrote through to the disk');

  // same again through the compound form real tasks send
  var was2;
  do{
    was2 = ctx.demo.job;
    await was2;
    await new Promise(function(ok){ setTimeout(ok, 0) });
  }while(was2 !== ctx.demo.job);
  var mark = out.length;
  plays.push('```json\n{"tool":"save","path":"ho.txt","text":"ho"}\n```');
  plays.push('Done writing ho.txt.');
  ws.send('{"#":"9","$":"cd ~ && aid put ho in ho.txt\\r"}');
  do{
    was2 = ctx.demo.job;
    await was2;
    await new Promise(function(ok){ setTimeout(ok, 0) });
  }while(was2 !== ctx.demo.job);
  var more = out.slice(mark).join('');
  assert(/aid put ho in ho\.txt\r\n/.test(more), 'compound chain still routes to aid');
  assert(bag['/root/ho.txt'] === 'ho', 'compound task wrote its file');

  // richer shell stays out of the way, even once it owns the screen
  ctx.Worker = function(){};
  assert(!ctx.demo.pod.use('aid fix css'), 'aid keeps the instant demo path');
  assert(!ctx.demo.pod.use('cd ~ && aid fix css'), 'kept wins inside chains');
  assert(!ctx.demo.pod.use('aid fix css') && !ctx.demo.pod.on, 'quick path before pod wakes');
  ctx.demo.pod.on = 1;
  assert(!ctx.demo.pod.use('aid fix css'), 'kept beats a live richer shell');
  assert(ctx.demo.pod.use('node hello.js'), 'node still selects the richer browser shell');

  console.log('PASS aid agent loop, keys, chain, tools');
}()).catch(function(err){
  console.error(err);
  process.exitCode = 1;
});

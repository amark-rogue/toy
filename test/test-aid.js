const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

var belt = [], talk = [], pty = [], ids = [], tries = 0, ears = {};
var lS = {
  getItem: function(k){ return null == this[k] ? null : this[k] },
  setItem: function(k, v){ this[k] = '' + v },
  removeItem: function(k){ delete this[k] }
};
var sS = {};
var ctx = {
  console: console, location: {}, localStorage:lS, sessionStorage:sS,
  navigator: {}, screen: {}, sign: {}, Math:Math, Date:Date, URL:URL,
  host: {value:'', addEventListener:function(){}, ear:function(){}}, cop:{sign:function(){}},
  kit: {
    say: function(data, name){
      var one;
      if('belt' === name){ belt.push(data) }
      if('chat' === name && '{' === ('' + data).charAt(0)){
        try{ one = JSON.parse(data); talk.push(one) }catch(e){}
      }
    },
    ear: function(name, fn){ ears[name] = fn }
  },
  document: {
    currentScript:{src:'http://toy/cmd/aid/aid.js'},
    createElement:function(){ return {} },
    head:{pin:function(s){ setTimeout(function(){ if(s.onload){ s.onload() } }, 0) }}
  },
  fetch: async function(url){
    tries += 1;
    if(0 <= url.indexOf('ch.at')){
      return {ok:false, status:429, statusText:'busy', text:async function(){ return 'busy' }};
    }
    return {ok:true, status:200, json:async function(){ return {choices:[{message:{content:'hello from ollama'}}]} }};
  },
  TextDecoder:TextDecoder, TextEncoder:TextEncoder, AbortController:AbortController,
  Promise:Promise, setTimeout:setTimeout, clearTimeout:clearTimeout,
  CustomEvent:function(){}, Error:Error, JSON:JSON, Object:Object, RegExp:RegExp
};
ctx.window = ctx;
vm.createContext(ctx);

var load = function(file){ vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, {filename:file}) };
load('vm/boot.js'); load('vm/demo.js'); load('vm/pod/core.js');
ctx.demo.ok = 0; load('cmd/aid/aid.js');
var pref = [];
ctx.document.head.pin = function(link){ pref.push(link.href) };
ctx.aid.pref();
assert(!pref.some(function(url){ return /\/free\.js$/.test(url) }), 'the FreeLLM directory part is never prefetched before a user invokes aid');
ctx.document.head.pin = function(s){ setTimeout(function(){ if(s.onload){ s.onload() } }, 0) };
assert(ctx.aid.route && !ctx.aid.route.match.test('aid host command'), 'the feature installs one dormant route without intercepting a host');
ctx.demo.ok = 1; assert(ctx.aid.route.match.test('aid host command'), 'the route activates from generic demo state without a demo callback');
assert.strictEqual(ctx.aid.plug(), 0, 'repeated feature registration stays idempotent');
ctx.demo.ok = 0; assert(!ctx.aid.route.match.test('aid host command'), 'leaving demo gives command ownership back to the host');
ctx.demo.ok = 1;

assert(ctx.VM.cmd.routes.some(function(r){ return r.match.test('aid fix app.css') }));
assert(ctx.VM.cmd.routes.some(function(r){ return r.match.test('cd ~ && aid fix app.css') }));
assert(ctx.VM.cmd.routes.some(function(r){ return r.match.test('ls; aid fix app.css') }));
assert(!ctx.VM.cmd.routes.some(function(r){ return r.match.test('aidx') }));
assert(!ctx.VM.cmd.routes.some(function(r){ return r.match.test('maiden voyage') }));
assert.strictEqual(JSON.stringify(ctx.aid.cut("echo 'x;y' && aid fix; pwd")), JSON.stringify([
  {text:"echo 'x;y' ", and:1}, {text:' aid fix', and:0}, {text:' pwd', and:0}
]), 'compound aid route preserves quoted separators and shell order');

ctx.aid.part.forEach(function(name){ load('cmd/aid/' + name + '.js') });
['memo','todo','past','web','role','task'].forEach(function(name){
  assert(ctx.aid.tool.def.some(function(one){ return one.function.name === name }), name + ' is in the shared tool catalog');
});
assert.strictEqual(typeof ctx.aid.use.role, 'function', 'role tool is wired to its generic action');

JSON.parse(fs.readFileSync('test/samples/aidtools.json', 'utf8')).forEach(function(row){
  var calls = ctx.aid.tool.take(row.text).map(function(one){ return {name:one.name, args:one.args} });
  assert.strictEqual(JSON.stringify(calls), JSON.stringify(row.calls), row.name + ' parses to the expected calls');
  if(row.note){ assert.strictEqual(ctx.aid.note, row.note, row.name + ' keeps only its visible preface') }
  if(row.miss){ assert(ctx.aid.tool.miss(row.text), row.name + ' cannot silently finish the agent') }
});

assert.strictEqual(ctx.aid.pick('sk-or-v1abc'), 'router');
assert.strictEqual(ctx.aid.pick('sk-ant-api03x'), 'anth');
assert.strictEqual(ctx.aid.pick('gsk_abc'), 'groq');
assert.strictEqual(ctx.aid.pick('AIzaSyabc'), 'gemini');
assert.strictEqual(ctx.aid.pick('sk-projabc'), 'openai');
assert.strictEqual(ctx.aid.chain().join(' '), 'chat');

assert.deepStrictEqual(ctx.aid.scan('```json\n{"tool":"read","path":"a"}\n```'), {tool:'read', path:'a'});
assert.strictEqual(JSON.stringify(ctx.aid.scan('```tool\n{"find":".map()","path":"/root/gun.js"}\n```')), JSON.stringify({tool:'find', word:'.map()', path:'/root/gun.js'}));
assert.strictEqual(JSON.stringify(ctx.aid.scan('{"find":".map()","path":"/root/gun.js"}')), JSON.stringify({tool:'find', word:'.map()', path:'/root/gun.js'}));
assert.deepStrictEqual(ctx.aid.scan(' {"tool":"find","word":"x"} '), {tool:'find', word:'x'});
var got = ctx.aid.scan('Let me inspect.\n{"tool":"read","path":"."}');
assert.deepStrictEqual(got, {tool:'read', path:'.'});
assert.strictEqual(ctx.aid.note, 'Let me inspect.');
got = ctx.aid.scan('{"tool":"write","path":"a.js","text":"function f(){ return {x:1} }"}');
assert.strictEqual(got.tool, 'write');
assert(/return \{x:1\}/.test(got.text));
assert.strictEqual(ctx.aid.scan('plain answer'), null);
assert.strictEqual(ctx.aid.tool.take('{"calls":[{"tool":"read","path":"a"},{"tool":"find","word":"x"}]}').length, 2);
got = ctx.aid.tool.take('{"tool":"role","op":"save","name":"Chief of staff","text":"Lead."}')[0];
assert.strictEqual(got.name, 'role'); assert.strictEqual(got.args.name, 'Chief of staff', 'name remains a tool argument when tool identifies the call');
got = ctx.aid.tool.take('{"tool":"todo","op":"done","id":"todo7"}')[0];
assert.strictEqual(got.id, ''); assert.strictEqual(got.args.id, 'todo7', 'id remains a text-tool argument while native calls retain their own call id');
got = ctx.aid.tool.take('{"calls":[{"read":"a"},{"find":"x","path":"."}]}');
assert.strictEqual(got[0].name + ':' + got[0].args.path, 'read:a');
assert.strictEqual(got[1].name + ':' + got[1].args.word + ':' + got[1].args.path, 'find:x:.');
assert.strictEqual(ctx.aid.scan('{"answer":"find","path":"a"}'), null, 'ordinary JSON is not mistaken for a tool');
assert.strictEqual(ctx.aid.scan('{"name":"Mars","status":"ready"}'), null, 'ordinary named JSON is not mistaken for a tool');
assert(ctx.aid.tool.miss('{"tool":"find",".map()","path":"/root/gun.js"}'), 'malformed tool-shaped output is not a final answer');
assert(ctx.aid.tool.miss('{"find":".map()"'), 'an unfinished keyed call is not a final answer');
assert(/```tool\n\{"tool":"read"/.test(ctx.aid.net.flat([{role:'assistant', calls:[{name:'read', args:{path:'a'}}]}])[0].content), 'plain providers see canonical fenced tool history');

(async function(){
  await ctx.demo.opfs.init(); await ctx.demo.opfs.mkdirp('/root');
  ctx.demo.cwd = '/root'; ctx.demo.ok = 1;

  await ctx.aid.role.load();
  var chiefrow = await ctx.aid.role.save({name:'Chief of staff', text:'Act as a trusted chief of staff. Organize decisions, risks, owners, and follow-ups.', pick:1});
  var coderow = await ctx.aid.role.save({name:'Software engineer', text:'Act as a careful software engineer. Inspect, change, and verify the project.'});
  var chiefid = chiefrow.id, codeid = coderow.id;
  assert(new RegExp(chiefid).test(await ctx.aid.role.cmd('Chief of staff')) && chiefid === ctx.aid.role.now, 'a user-made role can be selected by name');
  await ctx.aid.role.set('auto');
  var took, oldstart = ctx.aid.start;
  ctx.aid.start = async function(ask, opt){ took = {ask:ask, opt:opt} };
  await ctx.aid.task('plan I want a chief of staff'); ctx.aid.start = oldstart;
  assert.strictEqual(took.ask, 'I want a chief of staff', 'plain text remains a prompt');
  var act = '', realcfg = ctx.aid.cfg, realset = ctx.aid.set;
  ctx.aid.cfg = async function(raw){ act = raw; return 'ok' };
  ctx.aid.set = async function(){ act = '__set__'; return 'picked' };
  await ctx.aid.task('/model router/free'); assert.strictEqual(act, 'model router/free', 'slash-prefixed provider action is handled');
  await ctx.aid.task('/model'); assert.strictEqual(act, '__set__', 'bare /model opens the interactive provider+model picker');
  await ctx.aid.task('/catalog');
  act = ''; await ctx.aid.task('model router/free'); assert.strictEqual(act, '', 'bare provider action remains ordinary prompt text');
  ctx.aid.cfg = realcfg; ctx.aid.set = realset;
  assert.strictEqual(took.ask, 'I want a chief of staff');
  assert.strictEqual(took.opt.mode, 'plan'); assert.strictEqual(took.opt.role, undefined, 'natural role requests are not consumed as CLI aliases');

  var liferev = ctx.demo.rev;
  got = await ctx.aid.mem.act({op:'add', text:'The user prefers terse status notes.'});
  assert(/remembered/.test(got)); var mem = await ctx.aid.mem.all(); assert.strictEqual(mem.length, 1);
  got = await ctx.aid.todo.act({op:'add', text:'Send the weekly brief', due:'2030-01-02T09:00:00-08:00'});
  assert(/added/.test(got)); var todo = await ctx.aid.todo.all(); assert.strictEqual(todo[0].state, 'todo');
  assert.strictEqual(ctx.demo.rev, liferev, 'private memory and commitments do not dirty the project mirror');
  var chief = await ctx.aid.fresh('prepare a brief', 'work', chiefid);
  assert.strictEqual(chief.role, chiefid);
  assert(/chief of staff/i.test(chief.msgs[0].content) && /prefers terse/.test(chief.msgs[0].content) && /weekly brief/.test(chief.msgs[0].content), 'chief gets its role, memory, and commitments');
  assert(/Project tree:/.test(chief.msgs[0].content), 'user-made roles receive the same project context primitives');
  assert.strictEqual(await ctx.aid.ask.perm({mode:'plan'}, {name:'memo', args:{op:'add'}}), 0, 'plan cannot mutate memory');
  assert.strictEqual(await ctx.aid.ask.perm({mode:'plan'}, {name:'role', args:{op:'list'}}), 1, 'plan may inspect user-made roles');
  assert.strictEqual(await ctx.aid.ask.perm({mode:'plan'}, {name:'role', args:{op:'save'}}), 0, 'plan cannot persist a role');
  assert.strictEqual(await ctx.aid.ask.perm({mode:'plan'}, {name:'task', args:{mode:'plan'}}), 1, 'plan may delegate read-only work');
  assert.strictEqual(await ctx.aid.ask.perm({mode:'plan'}, {name:'task', args:{mode:'work'}}), 0, 'plan cannot delegate mutations');

  var show = await ctx.aid.cfg('/status');
  assert(/provider: chat/.test(show));
  show = await ctx.aid.cfg('/key sk-ant-api03xyz');
  assert(/anth/.test(show));
  assert.strictEqual(sS['aid.key.anth'], 'sk-ant-api03xyz', 'keys default to tab memory');
  assert.strictEqual(lS['aid.key.anth'], undefined, 'keys are not durable unless asked');
  await ctx.aid.cfg('/key keep groq gsk_keep');
  assert.strictEqual(lS['aid.key.groq'], 'gsk_keep', 'explicit keep persists');
  await ctx.aid.cfg('/free');
  assert.strictEqual(ctx.aid.now(), 'chat');
  var secret = ctx.aid.secret('openai');
  await new Promise(function(ok){ setTimeout(ok, 0) });
  var gate = talk.filter(function(one){ return 'ask' === one.kind && one.secret }).pop();
  assert(gate && !/sk-test/.test(JSON.stringify(gate)), 'credential prompt never echoes a key');
  ears['aid.ok']({detail:{id:gate.id, say:'sk-test'}}); await secret;
  assert.strictEqual(sS['aid.key.openai'], 'sk-test', 'secure prompt stores a tab-only key');

  // SSE JSON survives arbitrary network chunk boundaries.
  var enc = new TextEncoder(), chunks = [
    'data: {"choices":[{"delta":{"content":"he',
    'l"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n',
    '\ndata: [DONE]\n\n'
  ].map(function(s){ return enc.encode(s) }), seen = [], at = 0;
  await ctx.aid.sse({body:{getReader:function(){ return {read:async function(){
    return at < chunks.length ? {done:false, value:chunks[at++]} : {done:true};
  }}}}}, function(one){ seen.push(one.choices[0].delta.content) });
  assert.strictEqual(seen.join(''), 'hello', 'stream parser retains split JSON and delimiters');

  var wire = {text:'', calls:[], use:{}};
  ctx.aid.net.live(wire, {choices:[{delta:{tool_calls:[{index:0,id:'x',function:{name:'read',arguments:'{"pa'}}]}}]}, '', function(){});
  ctx.aid.net.live(wire, {choices:[{delta:{tool_calls:[{index:0,function:{arguments:'th":"a"}'}}]}}]}, '', function(){});
  wire = ctx.aid.net.done(wire);
  assert.strictEqual(wire.calls[0].args.path, 'a', 'native OpenAI tool arguments join across chunks');
  wire = {text:'', calls:[], use:{}};
  ctx.aid.net.live(wire, {index:0, content_block:{type:'tool_use', id:'y', name:'read', input:{}}}, 'content_block_start', function(){});
  ctx.aid.net.live(wire, {index:0, delta:{type:'input_json_delta', partial_json:'{"path":"b"}'}}, 'content_block_delta', function(){});
  wire = ctx.aid.net.done(wire);
  assert.strictEqual(wire.calls[0].args.path, 'b', 'empty Anthropic tool starts do not corrupt JSON deltas');

  ctx.aid.free = ['chat','ollama']; lS.aipro = ''; lS.aifall = 'on'; tries = 0;
  got = await ctx.aid.call([{role:'user', content:'hi'}]);
  assert.strictEqual(got.text, 'hello from ollama');
  assert.strictEqual(ctx.aid.hit, 'ollama');
  assert(tries >= 3, 'transient request retries once, then falls back');

  var wirefetch = ctx.fetch, asks = [];
  ctx.aid.free = ['ollama']; lS.aipro = 'ollama'; ctx.aid.net.plain = {};
  ctx.fetch = async function(url, opt){
    var body = JSON.parse(opt.body); asks.push(body);
    if(body.tools){ return {ok:false, status:422, statusText:'no tools', text:async function(){ return 'model has no native tools' }} }
    return {ok:true, status:200, json:async function(){ return {choices:[{message:{content:'plain model worked'}}]} }};
  };
  got = await ctx.aid.call([{role:'system', content:ctx.aid.tool.help()}, {role:'user', content:'hi'}]);
  assert.strictEqual(got.text, 'plain model worked');
  assert(asks[0].tools && !asks[1].tools && /```tool/.test(asks[1].messages[0].content), 'a model that declines native tools retries with canonical JSON: ' + JSON.stringify(asks));
  asks = []; got = await ctx.aid.call([{role:'system', content:ctx.aid.tool.help()}, {role:'user', content:'again'}]);
  assert(!asks[0].tools && 'plain model worked' === got.text, 'the negotiated model wire is remembered');
  ctx.fetch = wirefetch; delete lS.aipro;
  ctx.aid.free = ['chat'];

  // A provider's malformed tool JSON is repaired instead of ending the agent after one call.
  var realcall = ctx.aid.call, calls = 0, play = [
    '{"tool":"find",".map()","path":"/root/gun.js"}',
    '{"tool":"read","path":"."}',
    'Recovered after inspecting the folder.'
  ];
  var run = await ctx.aid.fresh('inspect the folder', 'work');
  ctx.aid.call = async function(){ calls += 1; return {text:play.shift(), calls:[]} };
  got = await ctx.aid.loop(run); ctx.aid.call = realcall;
  assert.strictEqual(got, 'Recovered after inspecting the folder.');
  assert.strictEqual(calls, 3, 'malformed tool JSON triggers another model call');
  assert.strictEqual(run.step, 1, 'the corrected tool executes before completion');
  assert(run.msgs.some(function(one){ return 'user' === one.role && /invalid, so no tool ran/.test(one.content) }), 'the model receives a precise repair request');

  // Native protocols cross the same validator; malformed arguments cannot end or execute.
  var need = ctx.aid.tool.def.filter(function(one){ return (one.function.parameters.required || []).length })[0].function;
  calls = 0; play = [
    {text:'', calls:[{id:'bad', function:{name:need.name, arguments:'{"broken"'}}]},
    {text:'Recovered after the native call was repaired.', calls:[]}
  ];
  run = await ctx.aid.fresh('test native repair', 'work');
  ctx.aid.call = async function(){ calls += 1; return play.shift() };
  got = await ctx.aid.loop(run); ctx.aid.call = realcall;
  assert.strictEqual(got, 'Recovered after the native call was repaired.');
  assert.strictEqual(calls, 2, 'malformed native JSON requests another model turn');
  assert.strictEqual(run.step, 0, 'malformed native arguments never reach a tool');

  // Some plain providers put the tool name in the first JSON key.
  calls = 0; play = [
    '{"find":".map()","path":"/root/gun.js"}',
    'Recovered after the keyed tool call.'
  ];
  run = await ctx.aid.fresh('find map', 'work');
  ctx.aid.call = async function(){ calls += 1; return {text:play.shift(), calls:[]} };
  got = await ctx.aid.loop(run); ctx.aid.call = realcall;
  assert.strictEqual(got, 'Recovered after the keyed tool call.');
  assert.strictEqual(calls, 2, 'keyed JSON continues after executing its tool');
  assert.strictEqual(run.step, 1, 'keyed JSON executes exactly one tool');

  play = [
    '```tool\n{"tool":"role","op":"save","name":"Operations lead","text":"Organize decisions and owners.","pick":true}\n```',
    'The Operations lead role is ready.'
  ];
  run = await ctx.aid.fresh('I want an operations lead', 'all');
  ctx.aid.call = async function(){ return {text:play.shift(), calls:[]} };
  got = await ctx.aid.loop(run); ctx.aid.call = realcall;
  assert(ctx.aid.role.find('Operations lead') && /role is ready/.test(got), 'natural language can create a reusable role through the generic tool: ' + JSON.stringify({step:run.step, msgs:run.msgs.slice(-4), view:talk.slice(-8)}));
  assert.strictEqual(run.role, ctx.aid.role.find('Operations lead').id, 'a newly selected role updates the active session');

  // Project tools share OPFS, journal exact edits, and undo them.
  await ctx.demo.opfs.write('/root/app.js', 'one\ntwo\n');
  run = await ctx.aid.fresh('change app', 'work'); ctx.aid.diff.begin(run);
  got = await ctx.aid.use.find({word:'two', path:'app.js'}, run);
  assert(/\/root\/app\.js:2: two/.test(got), 'find accepts an exact file path as well as a folder');
  await ctx.demo.opfs.mkdirp('/root/gun'); await ctx.demo.opfs.write('/root/gun/gun.js', 'alpha\nfunction map(){}\nomega\n');
  var pathrun = await ctx.aid.fresh('trace map', 'work', codeid, 0, '/root/gun');
  got = await ctx.aid.use.read({path:'./gun.js'}, pathrun); assert(/2: function map/.test(got));
  got = await ctx.aid.use.find({word:'map', path:'/root/gun/gun.js'}, pathrun);
  assert(/\/root\/gun\/gun\.js:2: function map/.test(got), 'read then find accepts the same exact absolute file path');
  got = await ctx.aid.use.find({word:'map', path:'/root/gun.js'}, run);
  assert(/^Resolved missing path \/root\/gun\.js to \/root\/gun\/gun\.js\./.test(got) && /function map/.test(got), 'read-only search repairs one unambiguous stale path');
  got = await ctx.aid.use.read({path:'/root/gun.js', line:2, count:1}, run);
  assert(/Resolved missing path/.test(got) && /2: function map/.test(got), 'read uses the same path recovery primitive');
  await ctx.demo.opfs.mkdirp('/root/copy'); await ctx.demo.opfs.write('/root/copy/gun.js', 'another map\n');
  await assert.rejects(function(){ return ctx.aid.use.read({path:'/root/gun.js'}, run) }, function(err){
    return /Possible matches:/.test(err.message) && /\/root\/copy\/gun\.js/.test(err.message) && /\/root\/gun\/gun\.js/.test(err.message);
  }, 'an ambiguous stale path lists candidates instead of guessing');
  await ctx.demo.opfs.rm('/root/copy', 1);
  got = await ctx.aid.use.read({path:'app.js', line:2, count:1}, run);
  assert(/^2: two/.test(got));
  got = await ctx.aid.use.edit({path:'app.js', old:'two', text:'three'}, run);
  assert(/\+three/.test(got));
  ctx.aid.diff.commit(run); var rev = ctx.demo.rev; await ctx.aid.store.save(run);
  assert.strictEqual(ctx.demo.rev, rev, 'private session saves do not dirty the project mirror');
  assert.strictEqual(await ctx.demo.opfs.readText('/root/app.js'), 'one\nthree\n');
  assert(/-two/.test(await ctx.aid.diff.all(run)));
  assert(/undid/.test(await ctx.aid.diff.back(run)));
  assert.strictEqual(await ctx.demo.opfs.readText('/root/app.js'), 'one\ntwo\n');

  var saved = await ctx.aid.store.load(run.id);
  assert.strictEqual(saved.id, run.id, 'session survives through OPFS JSON');
  assert((await ctx.aid.store.list()).some(function(one){ return one.id === run.id }));
  assert(/change app/.test(await ctx.aid.use.past({word:'change app'})), 'past searches durable session context');
  assert.strictEqual(await ctx.aid.ask.perm({mode:'plan'}, {name:'write'}), 0, 'plan mode cannot write');
  assert.throws(function(){ ctx.aid.disk.abs('../../.aid', run) }, /outside/, 'tools cannot reach private agent state');
  var long = {sum:'', msgs:[
    {role:'system', content:'rules'}, {role:'user', content:'x'.repeat(45000)},
    {role:'assistant', content:'', calls:[{id:'z',name:'read',args:{path:'a'}}]},
    {role:'tool', id:'z', name:'read', content:'y'.repeat(30000)}, {role:'user', content:'continue'}
  ]};
  assert(ctx.aid.ctx.trim(long), 'large context compacts');
  assert(long.msgs.some(function(one){ return 'assistant' === one.role && one.calls }) && long.msgs.some(function(one){ return 'tool' === one.role && 'z' === one.id }), 'compaction retains complete tool pairs');
  await ctx.demo.opfs.write('/root/raw.bin', new Uint8Array([0,1,2]));
  var snap = await ctx.aid.disk.snap('/root'); run.work = []; await ctx.demo.opfs.rm('/root/raw.bin');
  assert.strictEqual(await ctx.aid.disk.chg(run, snap), 1, 'binary shell changes are reported but never journaled as text');
  assert.strictEqual(run.work.length, 0, 'unsafe binary undo data is not recorded');

  // A weak provider may drop a parent folder even after seeing the project tree.
  calls = 0; play = [
    '{"find":"map","path":"/root/gun.js"}',
    'The map implementation is in /root/gun/gun.js.'
  ];
  run = await ctx.aid.fresh('locate map despite path drift', 'work');
  assert(/Project tree:[\s\S]*gun\/gun\.js/.test(run.msgs[0].content), 'project context prints complete relative paths instead of ambiguous indentation');
  ctx.aid.call = async function(msg){
    calls += 1;
    if(2 === calls){
      assert(msg.some(function(one){ return 'tool' === one.role && /Resolved missing path \/root\/gun\.js to \/root\/gun\/gun\.js/.test(one.content) && /function map/.test(one.content) }), 'the repaired path and actual evidence return to the provider');
    }
    return {text:play.shift(), calls:[]};
  };
  got = await ctx.aid.loop(run); ctx.aid.call = realcall;
  assert.strictEqual(got, 'The map implementation is in /root/gun/gun.js.');
  assert.strictEqual(calls, 2, 'one stale read-only path completes without a retry loop');

  run = await ctx.aid.fresh('inspect an absent file', 'work');
  got = await ctx.aid.tool.run(run, {name:'read', args:{path:'/root/never.js'}});
  assert(got.bad && /no such file or directory/.test(got.content), 'failed tools carry machine-readable failure state');

  calls = 0; play = ['{"read":"/root/never.js"}', 'I could not inspect that missing file.'];
  run = await ctx.aid.fresh('inspect an absent file honestly', 'work');
  ctx.aid.call = async function(msg){
    calls += 1;
    if(2 === calls){
      assert(msg.some(function(one){ return 'tool' === one.role && /requested action did not happen/.test(one.content) }), 'a failed result carries its provider-independent grounding warning');
    }
    return {text:play.shift(), calls:[]};
  };
  got = await ctx.aid.loop(run); ctx.aid.call = realcall;
  assert.strictEqual(got, 'I could not inspect that missing file.');

  var oldfetch = ctx.fetch;
  ctx.fetch = async function(url){ return {
    ok:true, status:200, url:url, headers:{get:function(){ return 'text/plain' }},
    text:async function(){ return 'first line\nneedle line\nlast line' }
  } };
  got = await ctx.aid.use.web({url:'https://example.test/info', word:'needle'}, run); ctx.fetch = oldfetch;
  assert(/example\.test\/info/.test(got) && /needle line/.test(got) && !/first line/.test(got), 'web retrieves and narrows a public page');

  ctx.DOMParser = function(){ throw Error('fetched HTML must not enter a DOM parser') };
  got = ctx.aid.web.html('<title>Safe &amp; title</title><style>@import url(https://leak.test/css)</style><script>fetch("https://leak.test/run")</script>' +
    '<p onclick="location=\'/bad\'">Hello <b>world</b></p><img src="https://leak.test/pixel" onerror="alert(1)">' +
    '<a href="java&#x73;cript:alert(1)">bad</a><a href="https://user:pass@example.test/private">cred</a>' +
    '<a href="/safe?q=1&amp;x=2">Good <em>link</em></a><svg><a href="https://leak.test/svg">svg</a></svg>', 'https://example.test/page');
  delete ctx.DOMParser;
  assert(/^Safe & title\n/.test(got) && /Hello world/.test(got), 'web string scanner keeps visible page text and entities');
  assert(/Good link · https:\/\/example\.test\/safe\?q=1&x=2/.test(got), 'web string scanner keeps only resolved credential-free HTTP links');
  assert(!/leak\.test|javascript:|user:pass|onclick|onerror|@import|fetch\(/.test(got), 'web string scanner never exposes or activates executable and subresource markup');

  var boss = await ctx.aid.fresh('delegate research', 'work', chiefid), play2 = [
    '{"tool":"find","word":"map","path":"/root/gun/gun.js"}',
    'The map function is on line 2.'
  ];
  ctx.aid.call = async function(){ return {text:play2.shift(), calls:[]} };
  got = await ctx.aid.use.task({ask:'locate map', role:codeid, mode:'plan'}, boss); ctx.aid.call = realcall;
  assert(new RegExp(codeid + ' agent .*1 tool steps').test(got) && /line 2/.test(got), 'a bounded child agent uses a user-made role');

  boss = await ctx.aid.fresh('delegate an edit', 'work', chiefid); ctx.aid.diff.begin(boss); play2 = [
    '{"tool":"edit","path":"/root/app.js","old":"two","text":"child"}',
    'The delegated edit is complete.'
  ];
  ctx.aid.call = async function(){ return {text:play2.shift(), calls:[]} };
  await ctx.aid.use.task({ask:'change two to child', role:codeid, mode:'work'}, boss); ctx.aid.call = realcall;
  assert((boss.work || []).some(function(one){ return '/root/app.js' === one.path }), 'delegated edits merge into the parent journal');
  assert.strictEqual(await ctx.demo.opfs.readText('/root/app.js'), 'one\nchild\n');

  await ctx.demo.opfs.write('/root/app.js', 'one\nchild\n');
  boss = await ctx.aid.fresh('delegate a risky edit', 'work', chiefid); ctx.aid.diff.begin(boss); play2 = [
    '{"tool":"edit","path":"/root/app.js","old":"child","text":"kept"}'
  ];
  ctx.aid.call = async function(){ if(play2.length){ return {text:play2.shift(), calls:[]} } throw Error('provider vanished') };
  try{ await ctx.aid.use.task({ask:'change child to kept', role:codeid, mode:'work'}, boss) }catch(e){ got = e.message }
  ctx.aid.call = realcall;
  assert(/provider vanished/.test(got) && (boss.work || []).some(function(one){ return '/root/app.js' === one.path }), 'a failed child still returns its edits to the parent journal');
  assert.strictEqual(await ctx.demo.opfs.readText('/root/app.js'), 'one\nkept\n');

  // A rich command uses Nodepod's process stream only when the quick shell cannot handle it.
  var oldsnap = ctx.aid.disk.snap, oldchg = ctx.aid.disk.chg, olduse = ctx.demo.pod.use;
  var oldprep = ctx.demo.pod.prep, oldseed = ctx.demo.pod.seed, oldwatch = ctx.demo.pod.watch, oldpod = ctx.demo.pod.pod;
  ctx.Worker = function(){}; ctx.aid.disk.snap = async function(){ return {} }; ctx.aid.disk.chg = async function(){};
  ctx.demo.pod.use = function(){ return 1 }; ctx.demo.pod.prep = async function(){}; ctx.demo.pod.seed = async function(){}; ctx.demo.pod.watch = function(){};
  ctx.demo.pod.pod = {spawn:async function(){
    var hear = {}, proc = {on:function(name, fn){ hear[name] = fn }};
    proc.completion = new Promise(function(ok){ setTimeout(function(){ hear.output('v22.12.0\n'); ok() }, 0) }); return proc;
  }};
  got = await ctx.aid.use.sh({line:'node -v'}, run, {id:'node1'});
  assert.strictEqual(got, 'v22.12.0\n', 'Nodepod process output returns to the model');
  ctx.demo.pod.on = 0; ctx.aid.disk.snap = oldsnap; ctx.aid.disk.chg = oldchg; ctx.demo.pod.use = olduse;
  ctx.demo.pod.prep = oldprep; ctx.demo.pod.seed = oldseed; ctx.demo.pod.watch = oldwatch; ctx.demo.pod.pod = oldpod;

  // End-to-end demo route: read, write, final prose, same task id, clean PTY close.
  await ctx.demo.opfs.mkdirp('/root/work');
  ctx.demo.tipped = 0; ctx.demo.at = 0; ctx.demo.job = Promise.resolve();
  ctx.demo.say = function(raw){
    var one;
    if('{' === String(raw).charAt(0)){
      try{ one = JSON.parse(raw); ids.push(one['#']); pty.push(one.$); return }catch(e){}
    }
    ids.push(''); pty.push(raw);
  };
  ctx.demo.wire();
  play = [
    '{"tool":"read","path":"."}',
    '{"tool":"write","path":"hi.txt","text":"hi"}',
    'Saved hi.txt. All done.'
  ];
  ctx.aid.call = async function(){ return {text:play.shift(), calls:[]} };
  ctx.demo.cmd.cd = async function(args){ ctx.demo.cwd = ctx.demo.path.abs(args[0]); return '' };
  var ws = ctx.demo.shim(); ws.send('{"#":"7","$":"cd /root/work && aid put hi in hi.txt\\r"}');
  var was;
  do{
    was = ctx.demo.job; await was;
    await new Promise(function(ok){ setTimeout(ok, 0) });
  }while(was !== ctx.demo.job);
  var frame = pty.join('');
  assert(ids.length > 1 && ids.every(function(id){ return '7' === id }), 'all PTY bytes keep the task id');
  assert(/aid put hi in hi\.txt\r\n/.test(frame), 'command echoes once');
  assert(frame.endsWith(ctx.demo.path.tip()), 'agent task closes on a fresh prompt in its inherited folder');
  assert.strictEqual(await ctx.demo.opfs.readText('/root/work/hi.txt'), 'hi', 'agent inherited the compound command folder');
  assert(talk.some(function(one){ return 'tool' === one.kind && 'read' === one.name }));
  assert(talk.some(function(one){ return 'done' === one.kind }));

  var podin = [];
  ctx.demo.pod.on = 1; ctx.demo.pod.term = {input:function(raw){ podin.push(raw) }};
  ctx.aid.call = async function(){ return {text:'Browser route stayed active.', calls:[]} };
  ws.send('{"#":"8","$":"aid confirm route\\r"}');
  do{
    was = ctx.demo.job; await was;
    await new Promise(function(ok){ setTimeout(ok, 0) });
  }while(was !== ctx.demo.job);
  assert.deepStrictEqual(podin, [], 'the registered feature route wins before a live Nodepod without a pod exception');
  assert(ctx.demo.pod.use('node hello.js'));

  console.log('PASS aid providers, SSE, sessions, tools, diff, undo, route');
}()).catch(function(err){ console.error(err); process.exitCode = 1 });

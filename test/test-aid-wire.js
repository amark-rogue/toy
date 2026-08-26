const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const make = require('./aidcase');

const ctx = {aid:{}, console, TextDecoder, TextEncoder, Uint8Array, Promise};
ctx.window = ctx; vm.createContext(ctx);
const load = name => vm.runInContext(fs.readFileSync(name, 'utf8'), ctx, {filename:name});
['use','scan','tool','open','anth','wire','live','sse'].forEach(name => load('cmd/aid/' + name + '.js'));

const sort = function(val){
  if(Array.isArray(val)){ return val.map(sort) }
  if(val && 'object' === typeof val){
    const out = {}; Object.keys(val).sort().forEach(function(key){ out[key] = sort(val[key]) }); return out;
  }
  return val;
};
const same = function(call){ return JSON.stringify(sort(make.same(call))) };
const turn = function(obj, call, note){
  const got = ctx.aid.net.turn(obj);
  assert.strictEqual(got.calls.length, 1, note + ' yields one call');
  assert.strictEqual(same(got.calls[0]), same(call), note + ' normalizes exactly');
};

ctx.aid.tool.def.forEach(function(def, n){
  const call = make.make(def, n + 1), keys = Object.keys(call.args);
  for(let turn = 0; turn < Math.max(3, keys.length + 1); turn++){
    const box = make.mix({tool:call.name, args:make.mix(call.args, turn)}, turn);
    const got = ctx.aid.tool.take('preface\n```tool\n' + JSON.stringify(box) + '\n```')[0];
    assert.strictEqual(same(got), same(Object.assign({}, call, {id:''})), call.name + ' canonical text order ' + turn);
  }
  [
    Object.assign({tool:call.name}, call.args),
    {name:call.name, arguments:JSON.stringify(call.args)},
    Object.assign({}, {[call.name]:call.args})
  ].forEach(function(box, i){
    const got = ctx.aid.tool.take(JSON.stringify(box))[0];
    assert.strictEqual(same(got), same(Object.assign({}, call, {id:''})), call.name + ' compatible text ' + i);
  });
  [
    {id:call.id, function:{name:call.name, arguments:JSON.stringify(call.args)}},
    {type:'function_call', call_id:call.id, name:call.name, arguments:call.args},
    {type:'tool_use', id:call.id, name:call.name, input:call.args},
    {id:call.id, functionCall:{name:call.name, args:call.args}},
    {toolUse:{toolUseId:call.id, name:call.name, input:call.args}},
    {toolCallId:call.id, toolName:call.name, input:call.args}, call
  ].forEach(function(raw, i){ assert.strictEqual(same(ctx.aid.tool.one(raw)), same(call), call.name + ' wire ' + i) });
  turn({choices:[{message:{tool_calls:[{id:call.id, function:{name:call.name, arguments:JSON.stringify(call.args)}}]}}]}, call, 'chat');
  turn({output:[{type:'function_call', call_id:call.id, name:call.name, arguments:JSON.stringify(call.args)}]}, call, 'responses');
  turn({content:[{type:'tool_use', id:call.id, name:call.name, input:call.args}]}, call, 'anthropic');
  turn({candidates:[{content:{parts:[{functionCall:{name:call.name, args:call.args}}]}}]}, Object.assign({}, call, {id:''}), 'gemini');
  turn({message:{tool_calls:[{id:call.id, function:{name:call.name, arguments:call.args}}]}}, call, 'ollama');
  turn({output:{message:{content:[{toolUse:{toolUseId:call.id, name:call.name, input:call.args}}]}}}, call, 'bedrock');
  assert(ctx.aid.net.flat([{role:'assistant', calls:[call]}])[0].content.includes('"args"'), call.name + ' history uses nested canonical args');

  const extra = Object.assign({}, call.args, {nevervalid:n});
  assert(ctx.aid.tool.one({name:call.name, args:extra}).bad, call.name + ' rejects undeclared arguments');
  const min = {}; (def.function.parameters.required || []).forEach(function(key){ min[key] = call.args[key] });
  assert(!ctx.aid.tool.one({name:call.name, args:min}).bad, call.name + ' accepts required-only arguments');
  keys.forEach(function(key){
    const args = Object.assign({}, call.args), set = def.function.parameters.properties[key], type = set.type;
    args[key] = 'string' === type ? 7 : 'number' === type ? '7' : 'boolean' === type ? 1 : 'array' === type ? {} : [];
    assert(ctx.aid.tool.one({name:call.name, args:args}).bad, call.name + ' rejects wrong ' + key + ' type');
    if('array' === type){ args[key] = [7]; assert(ctx.aid.tool.one({name:call.name, args:args}).bad, call.name + ' rejects wrong ' + key + ' item type') }
    if(set.enum){ args[key] = 'never-valid-enum'; assert(ctx.aid.tool.one({name:call.name, args:args}).bad, call.name + ' rejects wrong ' + key + ' enum') }
  });
  (def.function.parameters.required || []).forEach(function(key){
    const args = Object.assign({}, call.args); delete args[key];
    assert(ctx.aid.tool.one({name:call.name, args:args}).bad, call.name + ' rejects missing ' + key);
  });
});

const all = ctx.aid.tool.def.map(make.make);
const many = {calls:all.map(function(call){ return {tool:call.name, args:call.args} })};
assert.strictEqual(ctx.aid.tool.take('```tool\n' + JSON.stringify(many) + '\n```').length, all.length, 'one canonical block carries every declared tool without name cases');
assert.strictEqual(ctx.aid.tool.take('```tool\n' + JSON.stringify(many.calls) + '\n```').length, all.length, 'fenced call arrays normalize too');

const seed = make.make(ctx.aid.tool.def.filter(one => Object.keys(one.function.parameters.properties || {}).length)[0], 41);
assert(ctx.aid.tool.one({id:'bad', function:{name:seed.name, arguments:'{"broken"'}}).bad, 'broken native argument JSON is rejected');
assert(ctx.aid.tool.one({name:'not' + seed.name, args:{}}).bad, 'unknown native tool is rejected');
assert(!ctx.aid.tool.take('{"name":"ordinary data","args":{}}').length, 'ordinary JSON never becomes a tool');
ctx.aid.net.api.test = {turn:function(obj){ return {text:obj.say, calls:[seed], use:{total_tokens:9}} }};
let custom = ctx.aid.net.turn({say:'custom'}, 'test');
assert.strictEqual(custom.text, 'custom'); assert.strictEqual(same(custom.calls[0]), same(seed)); assert.strictEqual(custom.use.total_tokens, 9);
delete ctx.aid.net.api.test;

const stream = function(bits){
  var out = {text:'', calls:[], use:{}};
  bits.forEach(one => ctx.aid.net.live(out, one.data, one.type || '', function(){}));
  return ctx.aid.net.done(out);
};
let raw = JSON.stringify(seed.args);
for(let at = 0; at <= raw.length; at++){
  const got = stream([
    {data:{choices:[{delta:{tool_calls:[{index:0,id:seed.id,function:{name:seed.name,arguments:raw.slice(0, at)}}]}}]}},
    {data:{choices:[{delta:{tool_calls:[{index:0,function:{arguments:raw.slice(at)}}]}}]}}
  ]);
  assert.strictEqual(same(got.calls[0]), same(seed), 'OpenAI arguments survive split ' + at);
}
let got = stream([
  {type:'response.output_item.added', data:{output_index:0, item:{type:'function_call', id:'item', call_id:seed.id, name:seed.name, arguments:''}}},
  {type:'response.function_call_arguments.delta', data:{output_index:0, item_id:'item', delta:raw.slice(0, 3)}},
  {type:'response.function_call_arguments.delta', data:{output_index:0, item_id:'item', delta:raw.slice(3)}}
]);
assert.strictEqual(same(got.calls[0]), same(seed), 'Responses events normalize');
got = stream([
  {type:'content_block_start', data:{index:0, content_block:{type:'tool_use', id:seed.id, name:seed.name, input:{}}}},
  {type:'content_block_delta', data:{index:0, delta:{type:'input_json_delta', partial_json:raw.slice(0, 4)}}},
  {type:'content_block_delta', data:{index:0, delta:{type:'input_json_delta', partial_json:raw.slice(4)}}}
]);
assert.strictEqual(same(got.calls[0]), same(seed), 'Anthropic events normalize');
got = stream([{data:{message:{tool_calls:[{id:seed.id, function:{name:seed.name, arguments:seed.args}}]}}}]);
assert.strictEqual(same(got.calls[0]), same(seed), 'Ollama chunks normalize');
got = stream([{data:{candidates:[{content:{parts:[{functionCall:{name:seed.name, args:seed.args}}]}}]}}]);
assert.strictEqual(same(got.calls[0]), same(Object.assign({}, seed, {id:''})), 'Gemini chunks normalize');

const read = async function(text, size){
  const all = [], enc = new TextEncoder(), bytes = enc.encode(text); let at = 0;
  const res = {body:{getReader:function(){ return {read:async function(){
    if(at >= bytes.length){ return {done:true} }
    const end = Math.min(bytes.length, at + size), value = bytes.slice(at, end); at = end; return {done:false, value};
  }} }}};
  await ctx.aid.sse(res, function(one, type){ all.push({one, type}) }); return all;
};

(async function(){
  const obj = {choices:[{delta:{content:'λ'}}]}, sse = 'event: turn\ndata: ' + JSON.stringify(obj) + '\n\n', line = JSON.stringify(obj) + '\n';
  for(let size = 1; size <= sse.length; size++){
    let got = await read(sse, size); assert.strictEqual(got[0].one.choices[0].delta.content, 'λ'); assert.strictEqual(got[0].type, 'turn');
  }
  for(let size = 1; size <= line.length; size++){
    let got = await read(line, size); assert.strictEqual(got[0].one.choices[0].delta.content, 'λ', 'JSONL chunks ' + size);
  }
  console.log('PASS aid schema-generated tool and backend wire matrix');
}()).catch(function(err){ console.error(err); process.exitCode = 1 });

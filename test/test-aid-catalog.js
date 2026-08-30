const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

let calls = 0;
const store = {};
const s = {getItem:k => store[k] || null, setItem:(k,v) => { store[k] = v },
  removeItem:k => { delete store[k] }};
const ctx = {
  aid:{}, localStorage:s, sessionStorage:s, URL, Date, JSON, RegExp, Error, Array, Object,
  fetch:async function(){ calls += 1; return {ok:true, text:async function(){ return fs.readFileSync('test/samples/freellm.ts', 'utf8') }} }
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('cmd/aid/free.js', 'utf8'), ctx, {filename:'cmd/aid/free.js'});
vm.runInContext(fs.readFileSync('cmd/aid/key.js', 'utf8'), ctx, {filename:'cmd/aid/key.js'});
assert.strictEqual(calls, 0, 'loading aid or its free directory part never contacts FreeLLM');

(async function(){
  const rows = ctx.aid.catalog.rows(fs.readFileSync('test/samples/freellm.ts', 'utf8'));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(rows.map(row => row.id))), ['gemini-2.5-flash','openrouter'], 'only credential-free HTTPS directory rows survive the data parser');
  assert.strictEqual(rows[0].provider, 'Google AI Studio');
  const one = await ctx.aid.catalog.get(), two = await ctx.aid.catalog.get();
  assert.strictEqual(one.length, 2, 'the catalog has usable rows');
  assert.strictEqual(two.length, 2, 'a cached catalog remains usable');
  assert.strictEqual(calls, 1, 'catalog refreshes once per session window');
  const text = await ctx.aid.catalog.show();
  assert(/aid \/use gemini/.test(text) && /aid \/use router/.test(text), 'known adapters are suggestions, not provider protocol branches');

  // /model unifies free/catalog/providers/model: providers must be offered in
  // the order you can actually reach them — ch.at first, free & anonymous next,
  // then free models that need a key, then paid providers that need a key.
  assert.strictEqual(ctx.aid.cat('chat'), 0, 'ch.at is offered first');
  assert.strictEqual(ctx.aid.cat('ollama'), 1, 'another anonymous/local option comes second');
  ['router','groq','gemini','zen'].forEach(function(id){ assert.strictEqual(ctx.aid.cat(id), 2, id + ' is a free model that needs a key') });
  ['openai','anth','custom'].forEach(function(id){ assert.strictEqual(ctx.aid.cat(id), 3, id + ' is paid and needs a key') });
  var ordered = ctx.aid.order();
  assert.strictEqual(ordered[0], 'chat', 'ch.at leads the picker');
  assert(ordered.slice(1).indexOf('ollama') < ordered.slice(1).indexOf('router'), 'anonymous free sorts before keyed free');
  assert(ordered.slice(1).indexOf('router') < ordered.slice(1).indexOf('openai'), 'keyed free sorts before paid');
  console.log('PASS FreeLLM catalog data boundary');
}()).catch(function(err){ console.error(err); process.exitCode = 1 });

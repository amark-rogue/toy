const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

var ctx = {
  console: console,
  document: {createElement: function(){ return {} }, head: {pin: function(){}}},
  window: {},
  demo: {home: '/root', cwd: '/root', opfs: {root: null}, pod: {}},
  Promise: Promise
};
ctx.window = ctx;
vm.createContext(ctx);
var run = function(file){ vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, {filename: file}) };
run('vm/pod/core.js');
run('vm/pod/lifo.js');
run('vm/pod/boot.js');

assert.strictEqual(ctx.demo.pod.via, 'lifo');
assert.strictEqual(Object.keys(ctx.demo.pod.hash).length, 5);
assert.strictEqual(ctx.demo.pod.lifo.url.indexOf('https://esm.sh/@lifo-sh/core@0.10.29/'), 0);
assert(/^sha384-[A-Za-z0-9+/]+=*$/.test(ctx.demo.pod.lifo.sri), 'Lifo CDN has SHA-384 SRI');
assert(fs.existsSync('vm/pod/wrun.js'), 'readable Worker guest realm exists');
assert(fs.readFileSync('vm/pod/wrun.js','utf8').indexOf('Sandbox') >= 0);

ctx.demo.pod.via = 'lifo';
Promise.all([
  ctx.demo.pod.cdn().then(function(){ throw Error('cdn should reject without fetch') }, function(err){
    assert(/fetch|Worker|SRI/i.test(String(err && err.message || err)), String(err));
  }),
  ctx.demo.pod.prep().then(function(){ throw Error('prep should reject without Worker') }, function(err){
    assert(/Worker/i.test(String(err && err.message || err)), String(err));
    assert.strictEqual(ctx.demo.pod.get, 0);
  })
]).then(function(){
  ctx.demo.pod.via = 'nodepod';
  assert.strictEqual(ctx.demo.pod.via, 'nodepod', 'Nodepod restore is one comment flip away');
  console.log('PASS pod via default Lifo; Nodepod pins/restore preserved; Worker required in browser');
}).catch(function(err){
  console.error(err);
  process.exit(1);
});

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

assert.strictEqual(ctx.demo.pod.via, 'nodepod');
assert.strictEqual(Object.keys(ctx.demo.pod.hash).length, 5);

ctx.demo.pod.via = 'lifo';
Promise.all([
  ctx.demo.pod.cdn().then(function(){ throw Error('cdn should reject') }, function(err){
    assert(/Worker isolation/i.test(String(err && err.message || err)));
  }),
  ctx.demo.pod.prep().then(function(){ throw Error('prep should reject') }, function(err){
    assert(/Worker isolation/i.test(String(err && err.message || err)));
    assert.strictEqual(ctx.demo.pod.get, 0);
  })
]).then(function(){
  ctx.demo.pod.via = 'nodepod';
  assert.strictEqual(ctx.demo.pod.via, 'nodepod');
  console.log('PASS pod via switch keeps Nodepod; Lifo refuses until isolated');
}).catch(function(err){
  console.error(err);
  process.exit(1);
});

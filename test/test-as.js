var assert = require('assert'), fs = require('fs'), vm = require('vm');

function tag(name, up, type){
  return {name:name, parentNode:up, tagName:type || 'SPAN', hidden:true, textContent:'',
    getAttribute:function(key){ return 'name' === key ? this.name : null }};
}
var root = {}, body = tag('body', root, 'P'), bran = tag('branch', body, 'A');
var stat = tag('stat', body), note = tag('note', stat), sync = tag('sync', body), up = tag('up', sync, 'A');
var other = tag('other', root); other.hidden = false; other.textContent = 'keep';
root.querySelectorAll = function(){ return [body, bran, stat, note, sync, up, other] };

var web = fs.readFileSync('gun/kit/web.js', 'utf8');
var code = web.slice(web.indexOf('function root('), web.indexOf('function url('));
var win = {}, ctx = {window:win, document:root, WeakMap:WeakMap, kit:{}};
vm.createContext(ctx);
vm.runInContext('var U,W=window,D=document,bind=new WeakMap;\n' + code, ctx);

var data = {body:{branch:'main', stat:{note:'up to date'}, sync:{up:'origin/main'}}};
assert.strictEqual(ctx.kit.bind(root, data), root, 'bind returns its root');
assert.strictEqual(bran.textContent, 'main', 'nested names bind body.branch');
assert.strictEqual(note.textContent, 'up to date', 'nested names bind body.stat.note');
assert.strictEqual(up.textContent, 'origin/main', 'nested names bind body.sync.up');
assert(!body.hidden && !stat.hidden && !sync.hidden, 'bound response branches become visible');
assert.strictEqual(other.textContent, 'keep', 'unrelated names stay untouched');

ctx.kit.bind(root, {body:{branch:'next', stat:false, sync:false}});
assert.strictEqual(bran.textContent, 'next', 'a second response updates bound text');
assert(stat.hidden && sync.hidden, 'false response branches hide stale groups');
assert(web.includes('res.send = function'), 'createServer responses can send bound roots');
assert(web.includes("kit.querystring.parse(location.search)"), 'direct component URLs hydrate from their query');

var start = Date.now(), i;
for(i = 0; i < 10000; i += 1){ ctx.kit.bind(root, data) }
console.log('PASS integrated bind and send (' + (Date.now() - start) + 'ms/10k)');

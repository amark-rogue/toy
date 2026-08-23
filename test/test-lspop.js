var assert = require('assert');
var fs = require('fs');

var src = fs.readFileSync('cmd/ls-pop.html', 'utf8');
var pop = {}, menu = {}, tail = {}, sent = [];
var kit = {say:function(data, type){ sent.push({data:data, type:type}) }};

function take(key, at, i, n){
  at = src.indexOf(key);
  assert(at >= 0, key + ' exists');
  at = src.indexOf('{', at);
  n = 0;
  for(i = at; i < src.length; i += 1){
    if('{' === src.charAt(i)){ n += 1 }
    if('}' === src.charAt(i)){ n -= 1 }
    if(!n){ return src.slice(src.lastIndexOf('\n', at) + 1, i + 1) }
  }
  throw Error(key + ' closes');
}

eval(take('pop.quote = function'));
eval(take('pop.run = function'));

function run(item, act, eve){
  sent = [];
  pop.item = item;
  pop.hide = function(){};
  eve = {target:{closest:function(){ return {dataset:{run:act}} }}};
  pop.run(eve);
  assert.strictEqual(sent.length, 1, act + ' submits once');
  assert.strictEqual(sent[0].type, 'prompt', act + ' stays in its task');
  return sent[0].data;
}

assert.deepStrictEqual(run({name:'note.txt', file:1}, 'cp'),
  "cp 'note.txt' 'note.txt.copy' && ls .");
assert.deepStrictEqual(run({name:'notes', file:0}, 'cp'),
  "cp -R 'notes' 'notes.copy' && ls .");
assert.deepStrictEqual(run({name:'note.txt', file:1}, 'rm'),
  "rm 'note.txt' && ls .");
assert.deepStrictEqual(run({name:'notes', file:0}, 'rm'),
  "rm -r 'notes' && ls .");
assert.deepStrictEqual(run({name:'note.txt', file:1}, 'chmod'),
  "chmod 644 'note.txt' && ls .");
assert.deepStrictEqual(run({name:'notes', file:0}, 'chmod'),
  "chmod 755 'notes' && ls .");
assert.deepStrictEqual(run({name:'note.txt', file:1}, 'tail'),
  "tail -n 20 'note.txt'");
console.log('PASS ls popup commands stay in one task');

var assert = require('assert'), fs = require('fs');
var all = [], sent = [], ears = {};

function link(){
  all.forEach(function(t, i){
    t.previousElementSibling = all[i - 1] || null;
    t.nextElementSibling = all[i + 1] || null;
  });
}
function make(no, open, p){
  p = {textContent:'', removeAttribute:function(k){ this.edit = 'contenteditable' === k ? 0 : this.edit }, focus:function(){}};
  return {no:'' + no, open:open, was:[], attr:{no:'' + no}, parentNode:root,
    matches:function(s){ return 'task' === s },
    querySelector:function(s){ return 'prompt' === s ? p : null },
    getAttribute:function(k){ return this.attr[k] || '' },
    setAttribute:function(k,v){ this.attr[k] = '' + v }
  };
}
var root = {
  querySelector:function(s, no){
    if('task' === s){ return all[0] || null }
    no = (s.match(/no="([^"]+)/) || [])[1];
    return all.filter(function(t){ return t.no === no })[0] || null;
  },
  insertBefore:function(t, at){
    var i = at ? all.indexOf(at) : all.length;
    all.splice(i, 0, t); link();
  }
};
var shell = {core:{root:root}, head:function(raw){ return {bin:(raw.trim().split(/\s+/)[1] || '')} }, used:0};
shell.core.make = function(){ return make(10 + all.length, 1) };
shell.core.send = function(t, raw){ sent.push({t:t, raw:raw}) };
var kit = {ear:function(type, fn){ ears[type] = fn }};
var screen = {buzz:function(){}};

eval(fs.readFileSync('task.js', 'utf8'));
eval(fs.readFileSync('run.js', 'utf8'));

var boot = make(0, 1);
all = [boot]; link(); shell.task.at = boot;
shell.task.run({type:'prompt.same', target:{closest:function(){ return boot }}, detail:'cd ~/work && ls .'});
assert.strictEqual(sent[0].raw, 'cd ~/work && ls .\r', 'an initial cd command is not prefixed with itself');
assert.strictEqual(boot.path, '~/work', 'an initial string command records its directory');
sent = [];

var ls = make(1, 0), draft = make(2, 1);
ls.was = ['ls .']; ls.path = '~/notes';
all = [ls, draft]; link(); shell.$ = ls.querySelector('prompt'); shell.task.at = ls;

shell.task.run({type:'prompt.add', target:{}, detail:'codex'});
assert.strictEqual(sent[0].t, draft, 'belt command reuses the draft after its source task');
assert.strictEqual(sent[0].raw, 'cd ~/notes && codex\r', 'new belt task inherits its source directory');
assert.strictEqual(draft.show, 'codex', 'context setup stays out of the shown prompt');

sent = [];
shell.task.run({type:'prompt.add', target:{closest:function(){ return ls }}, detail:'cat todo.txt'});
assert.deepStrictEqual(all.map(function(t){ return t.show || 'ls' }), ['ls','cat todo.txt','codex'], 'add inserts immediately after its source');
assert.strictEqual(sent[0].raw, 'cd ~/notes && cat todo.txt\r', 'file task inherits the list directory');

sent = [];
shell.task.run({type:'prompt', target:{closest:function(){ return ls }}, detail:'pwd'});
assert.strictEqual(sent[0].t, ls, 'component prompts target their own task by default');
assert.strictEqual(sent[0].raw, 'pwd\r', 'existing tasks keep their live shell context');
assert.strictEqual(shell.task.get('#2', ls), draft, 'a task can be targeted by its stable number');

sent = [];
shell.task.run({type:'prompt', target:{}, detail:{'$':'echo ok', '#':'1'}});
assert.strictEqual(sent[0].t, ls, 'the compact envelope targets a task by number');
assert.strictEqual(sent[0].raw, 'echo ok\r', 'the compact envelope sends its dollar command');

assert.strictEqual(shell.task.dir('~/notes/src', 'cd .. && ls .'), '~/notes', 'commands update relative task directories');
assert.strictEqual(shell.task.dir('~/notes', 'cd docs\\ and\\ help && ls .'), '~/notes/docs and help', 'escaped paths update task directories');

sent = []; shell.task.at = ls;
shell.task.run({type:'prompt.same', target:{closest:function(){ return ls }}, detail:'cd ~/work && ls .'});
assert.strictEqual(ls.path, '~/work', 'a plain prompt.same command updates its task directory');
assert.strictEqual(ls.querySelector('prompt').textContent, 'cd ~/work && ls .', 'the runner updates the prompt without a prompt.set event');
sent = [];
shell.task.run({type:'prompt.add', target:{}, detail:'node -v'});
assert.strictEqual(sent[0].raw, 'cd ~/work && node -v\r', 'the next string task inherits that directory');

sent = []; shell.task.at = draft;
shell.task.run({type:'prompt.back', target:{}, detail:'pwd'});
assert.strictEqual(sent[0].t, draft.previousElementSibling, 'a string prompt.back runs in the preceding task');
sent = [];
shell.task.run({type:'prompt.next', target:{}, detail:'whoami'});
assert.strictEqual(sent[0].t, draft, 'a string prompt.next runs in the following task');

sent = [];
shell.task.run({type:'prompt', target:{}, detail:{'$':'false', '#':'same'}});
assert.strictEqual(sent.length, 0, 'a hash target cannot use a routing name');

global.getSelection = function(){ return {} };
global.document = {createRange:function(){ return {} }};
shell.ear = function(){};
eval(fs.readFileSync('was.js', 'utf8'));
var W = shell.was;
W.go = function(){};
var p = {textContent:'cat todo.txt'};
var t = {was:['ls .','cd notes','cat todo.txt'], pos:2, note:''};
W.step(t, p, -1);
assert.strictEqual(p.textContent, 'cd notes', 'left at the start selects preceding prompt history');
W.step(t, p, 1); W.step(t, p, 1);
assert.strictEqual(p.textContent, '', 'right beyond latest history restores the draft');
p.textContent = 'new draft'; W.step(t, p, -1); p.textContent = 'edited old'; W.step(t, p, 1);
assert.strictEqual(p.textContent, 'new draft', 'editing recalled history does not overwrite the draft');
console.log('PASS task targets, inherited context, placement, and history');

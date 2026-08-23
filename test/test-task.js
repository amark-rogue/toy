var assert = require('assert'), fs = require('fs');
var all = [], sent = [], ears = {};

function link(){
  all.forEach(function(t, i){
    t.previousElementSibling = all[i - 1] || null;
    t.nextElementSibling = all[i + 1] || null;
  });
}
function make(no, open, p){
  p = {textContent:'', attr:{}, removeAttribute:function(k){ this.edit = 'contenteditable' === k ? 0 : this.edit }, setAttribute:function(k,v){ this.attr[k] = v }, focus:function(){}};
  return {no:'' + no, open:open, idle:open ? 1 : 0, was:[], attr:{no:'' + no}, parentNode:root,
    matches:function(s){ return 'task' === s },
    raw:{textContent:'old status'}, frame:{src:'cmd/git.html', classList:{add:function(){ this.shut = 1 }}, removeAttribute:function(k){ if('src' === k){ this.src = '' } }},
    querySelector:function(s){ return 'prompt' === s ? p : 'raw' === s ? this.raw : 0 === s.indexOf('iframe') ? this.frame : null },
    getAttribute:function(k){ return this.attr[k] || '' },
    setAttribute:function(k,v){ this.attr[k] = '' + v },
    removeAttribute:function(k){ delete this.attr[k] },
    remove:function(){ var i = all.indexOf(this); if(0 <= i){ all.splice(i, 1); link() } this.parentNode = null }
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
assert.strictEqual(ears.prompt, shell.task.run, 'task runner owns generic prompt routing');
assert(!Object.keys(ears).some(function(name){ return 0 <= name.indexOf('.same') }), 'same-task routing has one canonical event');

var boot = make(0, 1);
all = [boot]; link(); shell.task.at = boot;
shell.task.run({type:'prompt', target:{closest:function(){ return boot }}, detail:'cd ~/work && ls .'});
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

var base = make(3, 0), ready = make(4, 1);
base.path = '~/ready'; base.was = ['ls .']; all = [base, ready]; link(); shell.task.at = ready; sent = [];
shell.task.run({type:'prompt.add', target:{}, detail:'git status'});
assert.strictEqual(sent[0].t, ready, 'belt command consumes the focused untouched automatic draft');
assert.strictEqual(sent[0].raw, 'cd ~/ready && git status\r', 'consumed automatic draft inherits its preceding task context');
assert.deepStrictEqual(all, [base, ready], 'belt command does not leave an automatic draft before its task');

sent = [];
all = [ls, draft]; link(); shell.task.at = ls;
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
shell.task.run({type:'prompt', target:{closest:function(){ return ls }}, detail:'cd ~/work && ls .'});
assert.strictEqual(ls.path, '~/work', 'a plain prompt command updates its task directory');
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

var range = {selectNodeContents:function(){}, collapse:function(){}};
global.document = {createRange:function(){ return range }};
global.getSelection = function(){ return {removeAllRanges:function(){}, addRange:function(){}} };

var home = make(30, 0), room = make(31, 1);
home.path = '~/demo'; home.was = ['ls .'];
all = [home, room]; link(); shell.task.at = home; sent = [];
var hand = shell.task('git status', 'prompt.add');
assert.strictEqual(hand.id, '31', 'shell.task returns the stable identity of the task it opened');
assert.strictEqual(sent[0].t, room, 'the task handle points at the newly added task');
assert.strictEqual(sent[0].raw, 'cd ~/demo && git status\r', 'the task handle inherits its source context');
assert.strictEqual(hand.set('git clone https://github.com/'), hand, 'setting a handle keeps the same identity');
assert.strictEqual(room.querySelector('prompt').textContent, 'git clone https://github.com/', 'a handle sets its exact task');
sent = [];
assert.strictEqual(hand.run('pwd'), hand, 'running a handle reuses its exact task by default');
assert.strictEqual(sent[0].raw, 'pwd\r', 'a reused handle keeps the live task context');
sent = [];
var after = hand.run('whoami', 'prompt.add');
assert.notStrictEqual(after, hand, 'a routed handle returns the other task it created');
assert.strictEqual(sent[0].raw, 'cd ~/demo && whoami\r', 'a routed handle composes placement with inherited context');

var spare = make(40, 1);
all = [ls, spare]; link();
ls.attr.bin = 'git'; ls.job = '1'; ls.was.push('git status'); ls.pos = ls.was.length - 1; ls.querySelector('prompt').textContent = 'git status';
shell.active = shell.live = ls;
ears['prompt.set']({type:'prompt.set', target:{closest:function(){ return ls }}, detail:'git clone https://github.com/'});
assert.strictEqual(ls.querySelector('prompt').textContent, 'git clone https://github.com/', 'prompt.set replaces the command in its task');
assert.strictEqual(ls.raw.textContent, '', 'prompt.set clears the old result');
assert.strictEqual(ls.frame.src, '', 'prompt.set unloads the old component without removing its slot');
assert.strictEqual(ls.job, '1', 'prompt.set preserves the task session');
assert.strictEqual(ls.path, '~/work', 'prompt.set preserves the working directory');
assert.deepStrictEqual(all, [ls], 'prompt.set removes the adjacent untouched automatic draft');

var done = make(41, 0), typed = make(42, 1);
typed.idle = 0; typed.querySelector('prompt').textContent = 'my draft';
all = [done, typed]; link();
ears['prompt.set']({type:'prompt.set', target:{closest:function(){ return done }}, detail:'retry'});
assert.deepStrictEqual(all, [done, typed], 'prompt.set preserves an adjacent draft the user touched');

var one = make(20, 0), two = make(21, 1);
one.path = '~/repo'; one.was = ['ls .']; all = [one, two]; link(); sent = [];
ears['prompt.add.set']({type:'prompt.add.set', target:{closest:function(){ return one }}, detail:'cat readme.md'});
assert.strictEqual(two.querySelector('prompt').textContent, 'cat readme.md', 'prompt.add.set prefills its targeted new task');
assert.strictEqual(two.path, '~/repo', 'a prefilled new task inherits its source directory');
assert.strictEqual(sent.length, 0, 'setting a prompt does not run it');

global.getSelection = function(){ return {} };
global.document = {createRange:function(){ return {} }};
shell.ear = function(){};
eval(fs.readFileSync('was.js', 'utf8'));
var W = shell.was;
W.go = function(){};
W.step(ls, ls.querySelector('prompt'), -1);
assert.strictEqual(ls.querySelector('prompt').textContent, 'git status', 'left from a set draft recalls the command that ran before it');
W.step(ls, ls.querySelector('prompt'), 1);
assert.strictEqual(ls.querySelector('prompt').textContent, 'git clone https://github.com/', 'right restores the set draft');
var p = {textContent:'cat todo.txt'};
var t = {was:['ls .','cd notes','cat todo.txt'], pos:2, note:''};
W.step(t, p, -1);
assert.strictEqual(p.textContent, 'cd notes', 'left at the start selects preceding prompt history');
W.step(t, p, 1); W.step(t, p, 1);
assert.strictEqual(p.textContent, '', 'right beyond latest history restores the draft');
p.textContent = 'new draft'; W.step(t, p, -1); p.textContent = 'edited old'; W.step(t, p, 1);
assert.strictEqual(p.textContent, 'new draft', 'editing recalled history does not overwrite the draft');
console.log('PASS task targets, inherited context, placement, and history');

var assert = require('assert');
var fs = require('fs');
var path = require('path');

global.HTMLElement = function(){};
global.HTMLElement.prototype = {};
global.NodeList = function(){};
global.NodeList.prototype = {};
global.document = {
  createElement: function(){ return {} },
  querySelectorAll: function(){ return [] },
  addEventListener: function(){},
  body: {addEventListener: function(){}}
};
global.window = {Tool:{}};
global.Tool = {};
global.screen = {};
global.navigator = {};

eval(fs.readFileSync(path.join(__dirname, '..', 'util.js'), 'utf8'));
var shellReply = window.shellReply;

var src = fs.readFileSync(path.join(__dirname, '..', 'shell.html'), 'utf8');
var fix = JSON.parse(fs.readFileSync(path.join(__dirname, 'samples', 'shelltask.json'), 'utf8'));
var shell = {raw:'', used:1, job:new WeakMap()};
var task = {};
var root = {
  querySelector: function(sel, id){
    id = sel.match(/job="([^"]+)/);
    return id && task[id[1]];
  }
};
var model = {};
var ESC = {};
var kit = {say:function(){}};
var next = function(){};

function take(key, at, end, i, c, out){
  at = src.indexOf(key);
  assert(at >= 0, key + ' exists');
  at = src.indexOf('{', at);
  c = 0;
  for(i = at; i < src.length; i += 1){
    if('{' === src.charAt(i)){ c += 1 }
    if('}' === src.charAt(i)){ c -= 1 }
    if(!c){ return src.slice(src.lastIndexOf('\n', at) + 1, i + 1) }
  }
  throw Error(key + ' closes');
}

function frame(id, bin, p, r, i, s){
  var box = {insertBefore:function(node){ node.parentNode = this }};
  p = {textContent:'', removeAttribute:function(){}, setAttribute:function(){}};
  r = {textContent:'', parentNode:box, append:function(){}, remove:function(){ this.parentNode = 0 }};
  s = {textContent:'', append:function(){}};
  i = {
    src:'',
    classList:{add:function(){}, remove:function(){}},
    parentNode:box,
    readyState:0,
    getAttribute:function(k){ return 'src' === k ? this.src : '' },
    removeAttribute:function(){}
  };
  return task[id] = {
    job:id,
    bin:bin || '',
    attr:{},
    parentNode:1,
    all:function(sel){
      if(0 === sel.indexOf('symbol')){ return [s] }
      if(0 === sel.indexOf('prompt')){ return [p] }
      if(0 === sel.indexOf('raw')){ return [r] }
      if(0 === sel.indexOf('iframe')){ return [i] }
      return [];
    },
    getAttribute:function(k){ return this.attr[k] || '' },
    setAttribute:function(k, v){ this.attr[k] = v },
    removeAttribute:function(k){ delete this.attr[k] }
  };
}

eval(take('shell.last = function'));
eval(take('shell.head = function'));
eval(take('function text('));
eval(take('function show('));
eval(take('function out('));
eval(take('shell.give = function'));
eval(take('shell.bash = function'));
eval(take('shell.exit = function'));
eval(take('shell.shut = function'));
eval(take('shell.stream = function'));
eval(take('shell.hook = function'));

var one = frame('1');
var two = frame('2');
fix.log.forEach(function(msg){ shell.hook(msg) });

assert.strictEqual(one.all('prompt')[0].textContent, 'ls .', 'list task keeps its command');
assert.strictEqual(one.all('raw')[0].textContent, 'one.txt\ttwo.txt\r\n', 'list task keeps only its output');
assert.strictEqual(two.all('prompt')[0].textContent, 'node -v', 'node task keeps its command');
assert.strictEqual(two.all('raw')[0].textContent, 'v24.14.1\r\n', 'node task keeps only its output');
assert.strictEqual(two.all('raw')[0].textContent.indexOf('one.txt'), -1, 'task output never crosses jobs');
assert.strictEqual(show(fix.node), 'v24.14.1\r\nbash-3.2$ ', 'echo removal keeps the result and closing tip');

var got;
shell.term = function(raw, mode, t){ got = {raw:raw, mode:mode, task:t} };
shell.stream(fs.readFileSync(path.join(__dirname, 'samples', 'darwin-arm64_nano_unknown.txt'), 'utf8'), two);
assert.strictEqual(got.task, two, 'terminal takeover stays on its task');
assert.strictEqual(got.mode, 'alt', 'alternate screen starts the terminal fallback');

var shut = frame('shut', 'term');
var ran = 0;
shut.setAttribute('bin', 'term');
shut.tty = shut.all('iframe')[0];
shut.tty.mode = 'alt';
next = function(){ ran += 1 };
shell.stream('\x1b[?1049l\r\nbash-3.2$ ', shut);
assert.strictEqual(shut.getAttribute('job'), '', 'closed terminal task loses its route');
assert.strictEqual(shut.getAttribute('bin'), '', 'closed terminal task no longer owns terminal input');
assert.strictEqual(ran, 1, 'closed terminal task creates one fresh prompt');

var back = frame('back', 'term');
back.setAttribute('bin', 'term');
back.tty = back.all('iframe')[0];
back.tty.mode = 'full';
shell.stream('\r\nbash-3.2$ ', back);
assert.strictEqual(back.getAttribute('job'), '', 'returned shell prompt closes a non-alt terminal task');
assert.strictEqual(ran, 2, 'returned shell prompt creates one fresh prompt');

var three = frame('3');
three.all('prompt')[0].textContent = 'node -v';
shell.hook({'#':'3', '$':fix.pod});
assert.strictEqual(three.all('prompt')[0].textContent, 'node -v', 'demo task keeps its command');
assert.strictEqual(three.all('raw')[0].textContent, 'v22.12.0\r\n', 'demo task hides its echoed command');

for(var at = 1, id, four; at < fix.pod.length; at += 1){
  id = 'pod' + at;
  four = frame(id);
  four.all('prompt')[0].textContent = 'node -v';
  shell.hook({'#':id, '$':fix.pod.slice(0, at)});
  shell.hook({'#':id, '$':fix.pod.slice(at)});
  assert.strictEqual(four.all('raw')[0].textContent, 'v22.12.0\r\n', 'demo split ' + at + ' keeps its result');
}

var sent = [];
var same = frame('same', 'ls');
var keep = same.all('iframe')[0];
same.all('prompt')[0].textContent = 'ls .';
same.cmd = 'ls .';
same.same = 1;
keep.src = './cmd/ls.html';
kit.http = {post:function(){ return {then:function(done){ done({ok:false, status:501}) }} }};
kit.say = function(data, type, target){ sent.push({data:data, type:type, target:target}) };
shell.stream('bash-3.2$ ls .\r\nnew', same);
assert.strictEqual(same.all('raw')[0].textContent, '', 'same-component partial data stays behind its iframe');
shell.stream('.txt\r\nbash-3.2$ ', same);
assert.strictEqual(sent.length, 1, 'same-component result is delivered once');
assert.strictEqual(sent[0].type, 'ls', 'same-component result keeps its renderer');
assert.strictEqual(sent[0].target, keep, 'same-component result reuses its iframe');
assert.strictEqual(keep.src, './cmd/ls.html', 'same-component iframe is not navigated');
assert.strictEqual(same.all('raw')[0].parentNode, 0, 'same-component raw data is never left visible');

var posts = [];
var finite = frame('finite', 'ls');
var finiteView = finite.all('iframe')[0];
finite.all('prompt')[0].textContent = 'ls .';
finite.cmd = 'ls .';
finite.same = 1;
finiteView.src = './cmd/ls.html';
kit.http = {
  post:function(view, data){
    posts.push({view:view, data:data});
    return {then:function(done){ done({ok:true}) }};
  }
};
kit.say = function(){ throw Error('a ready finite component must not receive the legacy event') };
shell.bash('bash-3.2$ ls .\r\nfinite.txt\r\n', finite);
assert.strictEqual(posts.length, 1, 'same-component refresh uses one finite request');
assert.strictEqual(posts[0].view, finiteView, 'finite request targets the existing iframe exactly');
assert.deepStrictEqual(posts[0].data, {'#':'finite', '$':'bash-3.2$ ls .\r\nfinite.txt\r\n'}, 'finite request carries the task and raw frame');

var failed = frame('failed', 'echo');
var failedView = failed.all('iframe')[0];
failed.all('prompt')[0].textContent = 'echo hello';
failed.cmd = 'echo hello';
failed.same = 1;
failedView.src = './cmd/echo.html';
kit.http = {post:function(){ return {then:function(done){ done({ok:false, status:500}) }} }};
kit.say = function(){ throw Error('a failed finite renderer must not become a command event') };
shell.bash('bash-3.2$ echo hello\r\nhello\r\n', failed);
assert.strictEqual(failed.all('raw')[0].parentNode, failedView.parentNode, 'a failed finite renderer restores plain output');
assert(0 <= failed.all('raw')[0].textContent.indexOf('hello'), 'restored output keeps the command result');

sent = [];
kit.http = {post:function(){ return {then:function(done){ done({ok:false, status:501}) }} }};
kit.say = function(data, type, target){ sent.push({data:data, type:type, target:target}) };
var dir = frame('dir', 'pwd');
var view = dir.all('iframe')[0];
dir.all('prompt')[0].textContent = 'pwd';
dir.cmd = 'pwd';
dir.show = 'pwd';
view.readyState = 1;
shell.bash('bash-3.2$ ', dir);
assert.strictEqual(dir.cmd, 'pwd', 'a bare startup prompt does not consume the pending command');
assert.strictEqual(view.src, '', 'a bare startup prompt does not open the pending component');
shell.stream('bash-3.2$ pwd\r\n/Users/mars/toy\r\nbash-3.2$ ', dir);
view.onload();
assert.strictEqual(dir.all('prompt')[0].textContent, 'pwd', 'startup setup stays out of the visible prompt');
assert.strictEqual(view.src, './cmd/pwd.html', 'pwd selects its component');
assert.strictEqual(sent[0].type, 'pwd', 'pwd output reaches its component');
assert(0 <= sent[0].data.indexOf('/Users/mars/toy'), 'pwd component receives the path bytes');

fs.readdirSync(path.join(__dirname, 'samples')).filter(function(name){
  return 0 <= name.indexOf('.shellnode.');
}).forEach(function(name, raw, cut, part, done){
  raw = fs.readFileSync(path.join(__dirname, 'samples', name), 'utf8');
  cut = shellReply.seek(raw, 'node -v');
  assert(cut, name + ' keeps the node command boundary');
  part = cut.splitPrompts();
  done = part.filter(function(one){ return 'node -v' === one.cmd() });
  assert.strictEqual(done.length, 1, name + ' has one node command frame');
  assert(/^v?\d+\.\d+/.test(show(done[0]).flat()), name + ' keeps node output after its echo');
  console.log('PASS sample', name);
});

assert(/task \{[\s\S]*?display: flow-root;/.test(src), 'task contains its prompt float');
assert(/raw \{[\s\S]*?clear: both;/.test(src), 'output clears the prompt float');
assert(!/['"](?:nano|vim|codex|claude|gemini|grok)['"]\s*===\s*h\.bin/.test(src), 'terminal mode has no command list');
console.log('PASS task frames, terminal scope, same-component refresh, demo frames, and prompt layout');

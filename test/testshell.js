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
  p = {textContent:'', removeAttribute:function(){}, setAttribute:function(){}};
  r = {textContent:'', append:function(){}};
  s = {textContent:'', append:function(){}};
  i = {
    classList:{add:function(){}, remove:function(){}},
    parentNode:1,
    readyState:0,
    getAttribute:function(){ return '' }
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
    setAttribute:function(k, v){ this.attr[k] = v }
  };
}

eval(take('shell.last = function'));
eval(take('shell.head = function'));
eval(take('function text('));
eval(take('function show('));
eval(take('function out('));
eval(take('shell.bash = function'));
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
console.log('PASS task frames, terminal scope, demo frames, and prompt layout');

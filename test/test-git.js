var assert = require('assert'), fs = require('fs'), sent = [];
var HTMLElement = global.HTMLElement = function(){};
HTMLElement.prototype = {};
var NodeList = global.NodeList = function(){};
NodeList.prototype = {};
var document = global.document = {createElement:function(){ return {} }, querySelectorAll:function(){ return [] }, addEventListener:function(){}, body:{addEventListener:function(){}}};
var window = global.window = {Tool:{}};
var Tool = global.Tool = {};
var screen = global.screen = {};
var navigator = global.navigator = {};
var ears = {};
var kit = {
  say:function(data, type){ sent.push({data:data, type:type}) },
  ear:function(type, fn){ ears[type] = fn },
  createServer:function(fn){ kit.server = fn }
};

eval(fs.readFileSync('util.js', 'utf8'));
eval(fs.readFileSync('cmd/git/grace.js', 'utf8'));
eval(fs.readFileSync('cmd/git/route.js', 'utf8'));

assert(window.GIT.bad('fatal: not a git repository', 'git status'), 'git status failure offers clone');
assert(window.GIT.bad('git: command not found', 'git status'), 'missing git offers clone');
assert(window.GIT.bad('sh: git: not found', 'git status'), 'demo missing git offers clone');
assert(!window.GIT.bad('fatal: repository not found', 'git clone bad'), 'other git failures keep their own result');
assert.strictEqual(window.GIT.cmd('~ $ cd ~ && git status'), 'git status', 'git command survives inherited directory setup');
window.GIT.try();
assert.deepStrictEqual(sent[0], {data:'git clone https://github.com/', type:'prompt.set'});
sent = [];
kit.server({body:'\u001b[?2004h~ $ cd ~ && git status\r\n\u001b[?2004l\rsh: git: not found\r\n'}, {send:function(){}});
assert.deepStrictEqual(sent[0], {data:'git clone https://github.com/', type:'prompt.set'}, 'the demo frame edits the Git task before optional UI loads');

var clone = "bash-3.2$ git clone https://github.com/amark-rogue/toy\r\n\x1b[?2004l\rCloning into 'toy'...\r\nremote: 189 objects\r\n\rReceiving objects: 13% (25/189)\rReceiving objects: 100% (189/189), done.\r\n";
assert.strictEqual(window.GIT.plain(clone),
  "Cloning into 'toy'...\r\nremote: 189 objects\r\nReceiving objects: 100% (189/189), done.\r\n",
  'clone result drops the echoed command and collapses progress');
assert(0 > window.GIT.plain(clone).indexOf('bash-3.2$'), 'clone result never repeats the prompt line');
assert(0 > window.GIT.plain(clone).indexOf('13%'), 'older clone percents are overtyped');
console.log('PASS git status failure edits its task into a clone prompt');
console.log('PASS git clone plain result drops echo and live percent leftovers');

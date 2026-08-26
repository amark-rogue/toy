var assert = require('assert'), fs = require('fs');
var src = fs.readFileSync('cmd/pwd.html', 'utf8'), PWD = {}, made = [];
var make = function(){ var v = {textContent:'', ear:function(name, fn){ this.hear = fn; return this }}; made.push(v); return v };
var row = {content:{firstElementChild:{cloneNode:make}}};
var view = {textContent:'', all:[], replaceChildren:function(){ this.all = [] }, pin:function(v){ this.all.push(v); return this }};
var B = {all:function(find){ return ['#crumb' === find ? row : view] }};
var kit = {say:function(){}};
PWD.row = row;

['claude','gemini','ps','pwd'].forEach(function(name, html){
  html = fs.readFileSync('cmd/' + name + '.html', 'utf8');
  assert(0 <= html.indexOf('kit/dom.js'), name + ' declares its B DOM helper dependency');
});

String.prototype.flat = function(){ return '' + this };
String.hit = function(s){ return /[$#>%]\s/.test(s) };

function take(key, at, end){
  at = src.indexOf(key);
  assert(0 <= at, key + ' exists');
  end = src.indexOf('\n};', at);
  return src.slice(at, end + 3);
}

eval(take('PWD.read = function'));
eval(take('PWD.draw = function'));

assert.strictEqual(PWD.read('pwd\r\n/Users/mars/toy\r\n'), '/Users/mars/toy', 'plain echo and path');
assert.strictEqual(PWD.read('bash-3.2$ pwd\r\n/Users/mars/toy\r\nbash-3.2$ '), '/Users/mars/toy', 'closing bash prompt is ignored');
assert.strictEqual(PWD.read('~ $ pwd\r\n/root/toy\r\n~ $ '), '/root/toy', 'closing demo prompt is ignored');
assert.strictEqual(PWD.read('/one path/two'), '/one path/two', 'bare path is retained');
PWD.draw('/Users/mars/toy');
assert.deepStrictEqual(view.all.map(function(v){ return v.textContent }), ['/','Users','mars','toy'], 'path renders through an explicit element lookup');
assert.strictEqual(view.all[3].hear instanceof Function, true, 'path crumbs remain interactive through dom.ear');
console.log('PASS pwd frame output');

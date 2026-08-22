var assert = require('assert'), fs = require('fs');
var src = fs.readFileSync('cmd/pwd.html', 'utf8'), PWD = {}, made = [];
var view = {textContent:'', all:[], replaceChildren:function(){ this.all = [] }, appendChild:function(v){ this.all.push(v) }};
var B = {all:function(){ return [view] }, new:function(){ var v = {}; made.push(v); return v }};
var kit = {say:function(){}};

['claude','echo','gemini','grep','mkdir','npm','ping','ps','pwd','whoami'].forEach(function(name, html){
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
assert.strictEqual(view.all[3].onclick instanceof Function, true, 'path crumbs remain interactive');
console.log('PASS pwd frame output');

var assert = require('assert'), fs = require('fs'), zlib = require('zlib');
var web = fs.readFileSync('gun/kit/web.js', 'utf8');
var finite = ['cat','cd','cp','echo','grep','ls','mkdir','mv','npm','ping','ps','pwd','rm','tail','touch','whoami'];

assert(web.length <= 23000, 'Kit browser source stays below 23 KB');
assert(zlib.gzipSync(web).length <= 7300, 'Kit browser source stays below 7.3 KB compressed');
assert(!/MessageChannel|kit\/(?:http|form)\.js/.test(web), 'requests reuse the one Kit iframe transport');
assert.strictEqual((web.match(/W\[ON\]\('http'/g) || []).length, 1, 'requests use one generic transport event');
assert(!/new (?:Headers|Response)|writeHead|setHeader|getHeader|statusCode|kit\.http/.test(web), 'Kit does not emulate Node HTTP or Fetch responses');

finite.forEach(function(name, src){
  src = fs.readFileSync('cmd/' + name + '.html', 'utf8');
  assert(src.indexOf('kit.createServer') >= 0, name + ' declares one finite server');
  assert(!new RegExp("kit\\.ear\\(['\"]" + name + "['\"]").test(src), name + ' has no duplicate hydration event');
});

var git = fs.readFileSync('cmd/git.html', 'utf8') + fs.readFileSync('cmd/git/route.js', 'utf8');
assert(git.indexOf('kit.createServer') >= 0, 'git declares a finite server');
assert(!/kit\.ear\(['"]git['"]/.test(git), 'git has no dead hydration listener');
['term','claude','gemini'].forEach(function(name, src){
  src = fs.readFileSync('cmd/' + name + '.html', 'utf8');
  assert(new RegExp("kit\\.ear\\(['\"]" + name + "['\"]").test(src), name + ' keeps its live stream');
});
assert(/kit\.ear\(["']open["']/.test(fs.readFileSync('cmd/open.html', 'utf8')), 'open keeps its VM reply stream');
assert(!/http\.can|http\.js/.test(fs.readFileSync('shell.html', 'utf8')), 'shell sends one request then uses generic stream fallback');
console.log('PASS one compact Kit transport and finite TOY components');

var assert = require('assert'), fs = require('fs'), sent = [];
var window = {};
var ears = {};
var kit = {
  say:function(data, type){ sent.push({data:data, type:type}) },
  ear:function(type, fn){ ears[type] = fn },
  createServer:function(fn){ kit.server = fn }
};

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
kit.server({body:{'$':'\u001b[?2004h~ $ cd ~ && git status\r\n\u001b[?2004l\rsh: git: not found\r\n'}});
assert.deepStrictEqual(sent[0], {data:'git clone https://github.com/', type:'prompt.set'}, 'the demo frame edits the Git task before optional UI loads');
console.log('PASS git status failure edits its task into a clone prompt');

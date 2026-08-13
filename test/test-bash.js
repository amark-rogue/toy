const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const utilCode = fs.readFileSync(path.join(root, 'util.js'), 'utf8');

global.HTMLElement = function(){};
global.HTMLElement.prototype = {};
global.NodeList = function(){};
global.NodeList.prototype = {};
global.document = {
  createElement: () => ({}),
  querySelectorAll: () => [],
  addEventListener: () => {},
  body: { addEventListener: () => {} }
};
global.window = { Tool: {} };
global.Tool = {};
global.screen = {};
global.navigator = {};

eval(utilCode);
var shellReply = window.shellReply;

function feed(chunks){
  var raw = '', done = [], i, part, cut;
  for(i = 0; i < chunks.length; i++){
    raw += chunks[i];
    if((cut = shellReply.seek(raw, 'ls .'))) raw = cut;
    raw = shellReply.heal(raw);
    part = raw.splitPrompts();
    if(part.length > 1){
      done = done.concat(part.slice(0, -1));
      raw = shellReply.heal(part[part.length - 1]);
    }
  }
  return {done: done, raw: raw};
}

// existing captures still split into command units
['android-arm64_user-log.txt', 'darwin-arm64_user-log.txt'].forEach(function(name){
  var chunks = fs.readFileSync(path.join(__dirname, 'samples', name), 'utf8').splitPrompts();
  assert(chunks.length >= 6, name + ' still splits into prompt units');
  assert(chunks[0].cmd(), name + ' first unit has a command');
  console.log('PASS sample', name, chunks.length);
});

assert.strictEqual('~ $ ls .'.cmd(), 'ls .');
assert.strictEqual('~ $ ~ $ ls .'.cmd(), 'ls .');
assert.strictEqual('$ ls .'.cmd(), 'ls .');
assert.strictEqual('bash-3.2$ whoami'.cmd(), 'whoami');
assert.strictEqual('~/gun $ git clone https://github.com/amark/gun'.cmd(), 'git clone https://github.com/amark/gun');
assert.strictEqual('~ $ echo foo $ bar'.cmd(), 'echo foo $ bar');
assert.strictEqual('100% (50/50)~ $ ls .'.cmd(), 'ls .');
assert.strictEqual('Receiving objects: 50% (50/100)'.cmd(), 'Receiving objects: 50% (50/100)');
console.log('PASS cmd peel / % is not a prompt');

var clone = '~ $ git clone https://github.com/amark/gun\r\n' +
  'Cloning into \'gun\'...\r\n' +
  'remote: 80 objects\r\n' +
  '\r25% (20/80)\r50% (40/80)\r100% (80/80)\r\n' +
  'done.\r\n~ $ ';
var part = clone.splitPrompts();
assert.strictEqual(part.length, 2, 'clone + % progress is one unit');
assert.strictEqual(part[0].cmd(), 'git clone https://github.com/amark/gun');
assert.strictEqual(part[1].cmd(), '');
assert.ok(/~$|~ \$ $/.test(part[1].flat()), 'leftover is the closing prompt');
console.log('PASS clone progress does not split');

var gitlike = '~ $ git clone https://github.com/amark/gun\r\n' +
  'Cloning into \'gun\'...\r\n' +
  '\rReceiving objects: 50% (40/80)\rReceiving objects: 100% (80/80), done.\r\n' +
  '\x1b[?2004h~ $ ';
part = gitlike.splitPrompts();
assert.strictEqual(part.length, 2, 'real git % lines stay in the clone unit');
assert.strictEqual(part[0].cmd(), 'git clone https://github.com/amark/gun');
console.log('PASS real git receiving objects');

assert.strictEqual(shellReply.heal('~ $ ~ $ '), '~ $ ');
assert.strictEqual(shellReply.heal('100% (80/80)~ $ '), '~ $ ');
assert.strictEqual(shellReply.peel('~ $ ~ $ ls .'), '~ $ ls .');
console.log('PASS heal stacked / glued tips');

var got = feed([
  '~ $ ',
  'git clone https://github.com/amark/gun\r\n',
  'Cloning into \'gun\'...\r\n',
  '\r25% (20/80)',
  '\r50% (40/80)',
  '\r100% (80/80)\r\ndone.\r\n',
  '~ $ '
]);
assert.strictEqual(got.done.length, 1, 'incremental clone emits one bash unit');
assert.strictEqual(got.done[0].cmd(), 'git clone https://github.com/amark/gun');
assert.strictEqual(got.raw.cmd(), '');
assert.ok(!/~ \$ ~ \$/.test(got.raw), 'leftover is a single tip');

got = feed([got.raw, 'ls .\r\nreadme.md\thello.js\r\n~ $ ']);
assert.strictEqual(got.done.length, 1, 'ls after clone is its own unit');
assert.strictEqual(got.done[0].cmd(), 'ls .');
assert.strictEqual((got.done[0].cmd().split(/\s+/)[0] || ''), 'ls');
console.log('PASS incremental clone then ls');

got = feed([
  '~ $ ~ $ ',
  'ls .\r\nreadme.md\r\n~ $ '
]);
assert.strictEqual(got.done[0].cmd(), 'ls .');
assert.ok(!/~ \$ ~ \$/.test(got.done[0].cmd()), 'stacked leftover does not leak into ls');
console.log('PASS stacked leftover then ls');

var dirty = feed([
  '100% (80/80)~ $ ',
  'ls .\r\nreadme.md\r\n~ $ '
]);
assert.strictEqual(dirty.done[0].cmd(), 'ls .');
dirty = feed(['100% (80/80)~ $ ls .\r\nreadme.md\r\n~ $ ']);
assert.strictEqual(dirty.done[0].cmd(), 'ls .');
console.log('PASS glued percent leftover then ls');

var seek = shellReply.seek(
  'Cloning into \'gun\'...\r\n100% (80/80)\r\n~ $ ls .\r\nreadme.md\r\n~ $ ',
  'ls .'
);
assert.ok(seek, 'seek finds the live ls after clone noise');
assert.strictEqual(seek.cmd(), 'ls .');
seek = shellReply.seek('100% (80/80)~ $ ls .\r\nreadme.md\r\n~ $ ', 'ls .');
assert.ok(seek, 'seek finds ls glued to a percent leftover');
assert.strictEqual(seek.cmd(), 'ls .');
assert.ok(0 === seek.indexOf('~ $ ls .'), 'seek starts at the real prompt not the percent');
console.log('PASS seek live command after noise');

console.log('PASS bash prompt split');

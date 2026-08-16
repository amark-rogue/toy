const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'samples');
const util = fs.readFileSync(path.join(__dirname, '..', 'util.js'), 'utf8');
eval(util.match(/String\.prototype\.tty = function[\s\S]*?\n};/)[0]);
const all = fs.readdirSync(dir);
const files = all.filter((name) => /_(nano|top|screen|codex)_/.test(name));
const plain = all.filter((name) => /_(echo_colored|ls_color)_/.test(name));

assert(files.length, 'terminal samples exist');
files.forEach((name) => {
  const raw = fs.readFileSync(path.join(dir, name), 'utf8');
  assert(raw.tty(), name + ' is detected as a terminal takeover');
  console.log('PASS', raw.tty(), name);
});
plain.forEach((name) => {
  const raw = fs.readFileSync(path.join(dir, name), 'utf8');
  assert.strictEqual(raw.tty(), '', name + ' stays in normal output');
  console.log('PASS text', name);
});

const web = fs.readFileSync(path.join(__dirname, '..', 'gun', 'kit', 'web.js'), 'utf8');
const src = web.match(/\nkit\.say = function[\s\S]*?\n};/)[0];
const W = new EventTarget();
const U = undefined;
const DEV = true;
const kit = {ears:{}, q:{}, views:new Map(), up:function(){ kit.sent += 1 }, sent:0};
eval(src);

const used = new EventTarget();
used.addEventListener('host', function(eve){ eve.preventDefault() });
kit.say('a', 'host', used, 1);
assert.strictEqual(kit.sent, 0, 'a consumed iframe event is not also sent raw');

const free = new EventTarget();
kit.say('a', 'host', free, 1);
assert.strictEqual(kit.sent, 1, 'an unconsumed iframe event still bubbles up');
console.log('PASS iframe event routing');

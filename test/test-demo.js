const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

var out = [];
var ctx = {
  console: console,
  location: {},
  localStorage: {getItem: function(){ return null }, setItem: function(){}},
  navigator: {},
  screen: {},
  sign: {},
  host: {value: ''},
  cop: {sign: function(){}},
  kit: {say: function(){}, ear: function(){}},
  document: {
    currentScript: {src: 'http://toy/vm/demo.js'},
    createElement: function(){ return {setAttribute: function(){}} },
    head: {appendChild: function(s){ setTimeout(function(){ if(s.onerror) s.onerror() }, 0) }}
  },
  fetch: async function(url){
    if(url.indexOf('/git/trees/') >= 0){
      return {ok: true, json: async function(){
        return {tree: [{path: 'index.html', type: 'blob'}]};
      }};
    }
    return {ok: true, arrayBuffer: async function(){
      return new TextEncoder().encode('ok').buffer;
    }};
  },
  TextDecoder: TextDecoder,
  TextEncoder: TextEncoder,
  Uint8Array: Uint8Array,
  URL: URL,
  Promise: Promise,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
ctx.window = ctx;
vm.createContext(ctx);

var run = function(file){
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, {filename: file});
};

run('vm/boot.js');
run('vm/demo.js');
run('vm/git.js');
run('vm/js/help.js');

ctx.demo.opfs.root = {};
ctx.demo.opfs.chain = Promise.resolve();
ctx.demo.opfs.mkdirp = async function(){};
ctx.demo.opfs.write = async function(){};
ctx.demo.ok = 1;
ctx.demo.tipped = 0;
ctx.demo.job = Promise.resolve();
ctx.demo.say = function(s){ out.push(s) };
ctx.demo.wire();

var ws = ctx.demo.shim();
ws.send('git clone https://github.com/acme/toy\r');
ws.send('help\r');

var wait = async function(){
  var was;
  do{
    was = ctx.demo.job;
    await was;
    await new Promise(function(ok){ setTimeout(ok, 0) });
  }while(was !== ctx.demo.job);
};

wait().then(function(){
  var got = out.join('');
  var real = fs.readFileSync('test/samples/darwin-arm64_user-log.txt', 'utf8');
  var git = got.indexOf('~ $ git clone https://github.com/acme/toy\r\n');
  var done = got.indexOf('\r\ndone.\r\n~ $ ');
  var help = got.indexOf('~ $ help\r\n');
  assert(git >= 0, 'clone command is echoed after a prompt');
  assert(done > git, 'clone output ends on its own prompt');
  assert(help > done, 'the next command waits for clone and its prompt');
  assert(!/[^\r]\n/.test(got), 'demo uses PTY CRLF line endings');
  assert(/\$ [^\r\n]+\r\n/.test(real), 'real PTY echoes commands after prompts');
  assert(/\$ [^\r\n]+\r\n/.test(got), 'demo matches real PTY command boundaries');
  assert(/~ \$ $/.test(got), 'the transcript ends at a prompt');
  console.log('PASS demo PTY stream');
}).catch(function(err){
  console.error(err);
  process.exitCode = 1;
});

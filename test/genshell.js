var fs = require('fs');
var os = require('os');
var path = require('path');
var pty = require('node-pty');

var dir = path.join(__dirname, 'samples');
var ver = process.version.replace(/^v/, 'v');
var name = [process.platform, process.arch, 'shellnode', ver].join('.') + '.txt';
var file = path.join(dir, name);
var out = '';
var term = pty.spawn('bash', [], {
  name:'xterm-256color',
  cols:80,
  rows:24,
  cwd:process.cwd(),
  env:process.env
});

term.onData(function(raw){ out += raw });
setTimeout(function(){ term.write('node -v\r') }, 150);
setTimeout(function(){
  try { term.kill() }catch(e){}
  fs.writeFileSync(file, out);
  console.log('saved', file);
}, 800);

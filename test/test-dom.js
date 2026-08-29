var assert = require('assert'), fs = require('fs');
var page = [
  'cmd/aid.html', 'cmd/book.html', 'cmd/cat.html', 'cmd/claude.html', 'cmd/gemini.html',
  'cmd/git.html', 'cmd/git/branch.html', 'cmd/grep.html', 'cmd/ls.html', 'cmd/ls-pop.html',
  'cmd/open.html', 'cmd/ps.html', 'cmd/pwd.html', 'cmd/ssh.html', 'cmd/term.html', 'shell.html'
].filter(fs.existsSync);
var code = page.concat([
  'cmd/aid/card.js', 'cmd/aid/mark.js', 'cmd/aid/ui.js', 'cmd/cat/view.js',
  'cmd/open/view.js', 'cmd/ssh/proxy.js'
]).filter(fs.existsSync);
var raw = /getElementById\(|querySelector(?:All)?\(|classList\.(?:add|remove|toggle)\(|\.append\(|\.(?:onclick|onkeydown|onsubmit|ontoggle)\s*=/;

page.forEach(function(file){
  assert(0 <= fs.readFileSync(file, 'utf8').indexOf('kit/dom.js'), file + ' declares its DOM primitive dependency');
});
code.forEach(function(file){
  assert(!raw.test(fs.readFileSync(file, 'utf8')), file + ' uses dom.js where it has an equivalent primitive');
});
console.log('PASS active components use the shared DOM primitives');

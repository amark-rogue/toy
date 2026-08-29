var assert = require('assert'), fs = require('fs');
var html = fs.readFileSync('cmd/aid.html', 'utf8');
var mark = fs.readFileSync('cmd/aid/mark.js', 'utf8');
var web = fs.readFileSync('cmd/aid/web.js', 'utf8');
var csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];

['default-src','img-src','media-src','font-src','frame-src','child-src','worker-src','object-src','form-action','base-uri','manifest-src'].forEach(function(name){
  assert(new RegExp(name + " 'none'").test(csp), name + ' is denied in the aid component');
});
assert(/script-src 'self'/.test(csp) && /style-src 'self'/.test(csp), 'only the component origin may supply code and CSS');
assert(/script-src-attr 'none'/.test(csp) && /style-src-attr 'none'/.test(csp), 'event and style attributes are explicitly denied');
assert(/connect-src http: https:/.test(csp), 'provider and local model connections remain available');
assert(!/unsafe-inline|data:|blob:/.test(csp), 'inline code and embedded resource schemes stay denied');
assert(!(html.match(/<script(?![^>]+\bsrc=)[^>]*>/g) || []).length, 'aid has no inline script that would weaken its policy');
assert(!/DOMParser|innerHTML|outerHTML|insertAdjacentHTML|createContextualFragment/.test(web), 'fetched pages never enter an HTML injection sink');
assert(/Object\.freeze\(view\)/.test(mark) && !/all\[i\]\(ctx\)/.test(mark), 'Markdown extensions receive a text view rather than the live render context');
assert(/node\.textContent = text/.test(mark) && /MD\.safe\(row\.url\)/.test(mark), 'extension output uses text and the shared URL policy');
console.log('PASS aid Markdown and fetched-page security contract');

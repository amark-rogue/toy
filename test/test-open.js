var assert = require('assert'), fs = require('fs');
var html = fs.readFileSync('cmd/open.html', 'utf8');
var view = fs.readFileSync('cmd/open/view.js', 'utf8');
var web = fs.readFileSync('gun/kit/web.js', 'utf8');
var frame = html.match(/<iframe id="page"[^>]+>/)[0];
var csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];

assert(/sandbox="allow-scripts"/.test(frame), 'preview keeps script rendering in an opaque sandbox');
assert(!/allow-(?:same-origin|forms|modals|popups|top-navigation|downloads)/.test(frame), 'preview restores no origin, navigation, form, popup, modal, or download privilege');
assert(/referrerpolicy="no-referrer"/.test(frame), 'preview suppresses referrers');
['camera','clipboard-read','clipboard-write','geolocation','microphone','payment','serial','usb'].forEach(function(name){
  assert(frame.indexOf(name + " 'none'") >= 0, name + ' permission is denied');
});
['default-src','connect-src','worker-src','frame-src','object-src','form-action','base-uri','manifest-src'].forEach(function(name){
  assert(new RegExp(name + " 'none'").test(csp), name + ' is denied by the preview policy');
});
assert(/Object\.defineProperty\(self, name, \{value:undefined\}\)/.test(html), 'the prelude closes the WebRTC gap left by current CSP implementations');
assert(html.indexOf('<base href="about:blank">') < html.indexOf('Content-Security-Policy'), 'the private base is fixed before the preview policy locks it');
assert(/DOMParser/.test(view) && /insertBefore\(doc\.importNode\(meta, true\), doc\.head\.firstChild\)/.test(view), 'the fixed policy is parsed before untrusted content');
assert(!/page\.src\s*=\s*url/.test(view), 'fetched HTML cannot bypass the srcdoc policy');
assert(/credentials:'omit'/.test(view) && /redirect:'error'/.test(view) && /referrerPolicy:'no-referrer'/.test(view), 'the trusted fetch omits ambient authority');
assert(/hasAttribute\('sandbox'\).*allow-same-origin/.test(web), 'Kit rejects messages from opaque sandbox frames');
console.log('PASS isolated open preview contract');

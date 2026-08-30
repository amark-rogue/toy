var assert = require('assert'), fs = require('fs'), vm = require('vm');

var web = fs.readFileSync('gun/kit/web.js', 'utf8');
var css = fs.readFileSync('gun/kit/web.css', 'utf8');

assert(/pre,\s*code,\s*kbd,\s*samp\s*\{\s*font:\s*inherit/.test(css),
  'pre and code inherit the component face');

function sty(start){
  var props = Object.assign({}, start || {}), order = Object.keys(props);
  var out = {
    getPropertyValue: function(k){ return props[k] || '' },
    setProperty: function(k, v){
      if(!(k in props)){ order.push(k) }
      props[k] = v;
      out[k] = v;
      out.length = order.length;
    },
    length: order.length
  };
  order.forEach(function(k, i){ out[i] = k; out[k] = props[k] });
  return out;
}

var html = {style: sty(), _kitVar: {}};
var body = {style: sty()};
var face = {
  'font-family': '"Courier New", monospace',
  'font-size': '16pt',
  'font-weight': '400',
  'font-style': 'normal',
  'line-height': '1.5',
  'color': 'rgb(191, 0, 255)'
};
var frame = {
  style: sty({'--font': "'Courier New', monospace"}),
  contentDocument: {documentElement: html, body: body}
};
var ctx = {
  window: {
    getComputedStyle: function(el){
      if(el === frame){
        return {
          getPropertyValue: function(k){ return face[k] || '' }
        };
      }
      return {getPropertyValue: function(){ return '' }};
    },
    addEventListener: function(){}
  },
  document: {},
  kit: {}
};
ctx.window.parent = ctx.window;
vm.createContext(ctx);
var start = web.indexOf('kit.vars = {}');
var end = web.indexOf('kit.frame = {}');
assert(start >= 0 && end > start, 'kit.vars module is a contiguous block');
vm.runInContext('var W=window,D=document,ON="addEventListener";\n' + web.slice(start, end), ctx);

assert(ctx.kit.vars.face.indexOf('font-family') >= 0, 'face includes font-family');

var got = {};
ctx.kit.vars.take({
  length: 0,
  getPropertyValue: function(k){ return k === '--font' ? "'Courier New', monospace" : '' }
}, got);
assert.strictEqual(got['--font'], "'Courier New', monospace", 'take reads --font even when it is not indexed');

ctx.kit.vars.ink(frame);
assert.strictEqual(html.style.getPropertyValue('font-family'), face['font-family'],
  'child html inherits the parent iframe face');
assert.strictEqual(body.style.getPropertyValue('font-family'), face['font-family'],
  'child body inherits the parent iframe face');
assert.strictEqual(html.style.getPropertyValue('font-size'), '16pt',
  'child html inherits the parent font size');
assert.strictEqual(body.style.getPropertyValue('color'), face.color,
  'child body inherits the parent text color');

console.log('PASS kit vars inherit parent text face');

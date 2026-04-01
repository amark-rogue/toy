var dom = HTMLElement.prototype, doms = NodeList.prototype, all = function(t,e){ (t.forEach?t:[t]).forEach(e); return t; }
dom.new = function(t){ return document.createElement(t) };
dom.all = function(q){ return this.querySelectorAll(q) };
dom.ear =doms.ear= function(e,h){ return all(this,v=>{v.addEventListener(e,h)}); return this };
dom.tag =doms.tag= function(c,s){ return all(this,v=>{v.classList[s?(s>0?'add':'remove'):'toggle'](c)}) };

String.prototype.cut = function(f, e, c){ e = e||{}, c = c||'\\';
  var q = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), L = v => ('string' == typeof v)?[v]:v,
    P = Object.entries(e).map(([k, v]) => q(k)+'[^]*?(?:'+L(v.end||v||k).map(q).join('|')+'|$)').concat(c? q(c)+'[^]' : []),
    R = new RegExp((P.length? '(?:'+P.join('|')+')|' : '') + '('+L(f).sort((a, b) => b.length - a.length).map(q).join('|')+')', 'g'), m;
  for(;m = R.exec(this);){ if(m[1]){ return [this.slice(0,m.index), m[1], this.slice(m.index+m[1].length)] } }
  return ['','',''+this];
};

String.prototype.flat = function(){
  return this.replace(/\x1B(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]+\x07)/g, '');
}

String.prototype.ansi = function() {
  var colors = {
    30: 'black', 31: 'red', 32: 'green', 33: 'yellow', 34: 'blue', 35: 'magenta', 36: 'cyan', 37: 'white',
    90: 'gray', 91: '#f55', 92: '#5f5', 93: '#ff5', 94: '#55f', 95: '#f5f', 96: '#5ff', 97: 'white'
  }, stack = [];
  return this.replace(/\x1B\[([0-9;]*)m/g, function(m, p1) {
    var out = '';
    p1.split(';').forEach(function(c) {
      c = parseInt(c) || 0;
      if (c === 0) {
        while (stack.length) { out += '</span>'; stack.pop(); }
      } else if (colors[c]) {
        out += '<span style="color:' + colors[c] + '">'; stack.push('</span>');
      } else if (c === 1) {
        out += '<span style="font-weight:bold">'; stack.push('</span>');
      }
    });
    return out;
  }) + (stack.join('') || '');
};

String.prototype.unansi = function() {
  var colors = {
    'black': 30, 'red': 31, 'green': 32, 'yellow': 33, 'blue': 34, 'magenta': 35, 'cyan': 36, 'white': 37,
    'gray': 90, '#f55': 91, '#5f5': 92, '#ff5': 93, '#55f': 94, '#f5f': 95, '#5ff': 96
  };
  var html = this;
  var res = html.replace(/<span style="(.*?)">/g, function(m, p1) {
    var code = '';
    if (p1.indexOf('color:') !== -1) {
      var col = p1.match(/color:\s*([^;"'\s]+)/)[1];
      if (colors[col]) code += colors[col];
    }
    if (p1.indexOf('font-weight:bold') !== -1) {
      code += (code ? ';' : '') + '1';
    }
    return code ? '\x1B[' + code + 'm' : '';
  });
  return res.replace(/<\/span>/g, '\x1B[0m');
};

ESC = {"'":'','"':'','#':'\n'};
var D = document, B = D.body;

window.buzz = function(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms || 9); } catch(e) {}
};
window.shellReply = window.shellReply || {
  clean: function(s){
    if(!s){ return s }
    return (''+s)
      .replace(/(?:^|\r?\n)WARNING: terminal is not fully functional(?:\r?\n|$)/g, '\n')
      .replace(/(?:^|\r?\n)Press RETURN to continue(?:\r?\n|$)/g, '\n')
      .replace(/(?:\r?\n)?--More--(?:\r?\n)?/g, '\n');
  },
  maybeContinue: function(s, opt, now){
    opt = opt || {};
    s = (s||'').flat();
    if(!/(Press RETURN to continue|--More--|\(END\))/.test(s)){ return false }
    now = Date.now();
    var state = opt.state || this;
    if(state.autoContinueAt && (now - state.autoContinueAt < (opt.wait || 700))){ return false }
    state.autoContinueAt = now;
    if(opt.send){ opt.send('\r') }
    return true;
  }
};
document.addEventListener('pointerdown', function(e) { return;
  var t = e.target;
  if (t.tagName === 'BUTTON' || t.closest('button') || t.tagName === 'A' || t.closest('a') || t.closest('[class$="-box"]')) {
    buzz(15);
  }
});

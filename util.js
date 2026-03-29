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
  return this
    .replace(/\x1B\[(\d*)C/g, function(m,n){ return ' '.repeat(+n||1) })
    .replace(/\x1B(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]+\x07)/g, '');
}

ESC = {"'":'','"':'','#':'\n'};
var D = document, B = D.body;

window.buzz = function(ms) {
  try {
    var ua = navigator.userActivation;
    if (ua && !ua.hasBeenActive && !ua.isActive) { return }
    if (navigator.vibrate) { navigator.vibrate(ms || 9) }
  } catch(e) {}
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

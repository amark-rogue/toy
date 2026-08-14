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

String.prototype.cr = function(){
  var s = ''+this, out = '', at = 0, i, c;
  for(i = 0; i < s.length; i++){
    c = s.charAt(i);
    if('\r' === c){ at = 0; continue }
    if('\n' === c){ out += c; at = out.length; continue }
    if(at < out.length) out = out.slice(0, at) + c + out.slice(at + 1);
    else out += c;
    at += 1;
  }
  return out;
};

String.ok = function(pre, sign, line, at, look){
  var last = at > 0 ? line.charAt(at - 1) : '';
  if('%' === sign && last >= '0' && last <= '9') return 0;
  if('>' === sign && ('=' === last || '-' === last)) return 0;
  pre = (pre || '').replace(/\s+$/, '');
  if(!pre){
    if('#' === sign) return look && 0 <= (''+look).indexOf('2004h');
    return 1;
  }
  if(0 > pre.indexOf(' ')) return 1;
  if(0 <= pre.indexOf('@')) return 1;
  if(0 === pre.indexOf('PS ')) return 1;
  if('(' === pre.charAt(0) && 0 <= pre.indexOf(')')) return 1;
  if('[' === pre.charAt(0)) return 1;
  return 0;
};

String.hit = function(line, look){
  line = '' + (line || '');
  var i, c, n, sign, pre, start;
  for(i = 0; i < line.length; i++){
    c = line.charAt(i);
    n = line.charAt(i + 1);
    sign = 0;
    if('P' === c && 'S' === n && '>' === line.charAt(i + 2) && /\s/.test(line.charAt(i + 3))) sign = 'PS>';
    else if('~' === c && '%' === n && /\s/.test(line.charAt(i + 2))) sign = '~%';
    else if(('$' === c || '#' === c || '>' === c || '%' === c) && /\s/.test(n)) sign = c;
    if(!sign) continue;
    pre = line.slice(0, i);
    if(!String.ok(pre, sign, line, i, look)) continue;
    start = 0;
    while(start < i && /\s/.test(line.charAt(start))) start += 1;
    if(start >= i) start = i;
    return {path: pre.trim(), sign: sign, cmd: line.slice(i + sign.length).replace(/^\s+/, ''), at: start};
  }
  return 0;
};

String.dir = function(p){
  if(!p) return 0;
  if('~' === p || 0 === p.indexOf('~/')) return 1;
  if(('/' === p.charAt(0) || '.' === p.charAt(0)) && 0 > p.indexOf('(') && 0 > p.indexOf(')')) return 1;
  return 0;
};

String.tail = function(line, look){
  var i, h, s;
  line = '' + (line || '');
  h = String.hit(line, look);
  if(h) return h;
  for(i = 1; i < line.length; i++){
    s = line.slice(i);
    if(/\s/.test(s.charAt(0))) continue;
    h = String.hit(s, look);
    if(h && String.dir(h.path)) return {path: h.path, sign: h.sign, cmd: h.cmd, at: i + h.at};
  }
  return 0;
};

String.prototype.cmd = function(s, line, hit){
  s = this.flat();
  line = s.split(/\r\n|\n|\r/)[0] || '';
  if(line.cr) line = line.cr();
  hit = String.hit(line);
  if(hit){
    s = hit.cmd;
    while(s && (hit = String.hit(s))){ s = hit.cmd }
    return (s || '').trim();
  }
  hit = String.tail(line);
  if(hit && String.dir(hit.path)) return (hit.cmd || '').trim();
  return line.trim();
};

String.prototype.tty = function(){
  if(/\x1b\[\?(?:47|1047|1049)h/.test(this)){ return 'alt' }
  if(/\x1b\[\?2026h/.test(this)){ return 'sync' }
  if(/\x1b\[\?25l/.test(this) && /\x1b\[(?:H\x1b\[J|2J)/.test(this)){ return 'full' }
  return '';
};

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
window.job = function(i, t){
  i = frameElement;
  t = i && i.closest('task');
  return (t && t.getAttribute('job')) || '';
};

window.buzz = screen.buzz = function(ms) {
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
  },
  peel: function(line){
    line = ('' + (line || '')).replace(/\r$/, '');
    var h, n;
    while((h = String.hit(line)) && (n = String.hit(h.cmd))){
      line = h.cmd;
    }
    return line;
  },
  heal: function(s){
    if(!s) return s;
    var flat = (''+s).flat(), fix, h, bit;
    if(/\n/.test(flat)) return s;
    fix = this.peel(flat);
    bit = fix.cr ? fix.cr() : fix;
    h = String.tail(bit);
    if(h && h.at > 0 && !(h.cmd || '').trim() && String.dir(h.path)){
      fix = bit.slice(h.at);
    }
    return (fix && fix !== flat) ? fix : s;
  },
  seek: function(s, want){
    if(!s || !want) return 0;
    var raw = ''+s, at = raw.lastIndexOf(want), pre, line, h, cmd, p, nl;
    if(at < 0) return 0;
    pre = raw.slice(0, at).flat();
    if(pre.cr) pre = pre.cr();
    if(!/[$#>%]\s+$/.test(pre)) return 0;
    nl = pre.lastIndexOf('\n') + 1;
    line = pre.slice(nl);
    h = String.hit(line) || String.tail(line);
    if(!h) return 0;
    cmd = (line + want).cmd();
    if(cmd !== want && 0 !== cmd.indexOf(want) && 0 !== want.indexOf(cmd)) return 0;
    if(h.path){
      p = raw.lastIndexOf(h.path, at);
      if(p >= 0 && p >= raw.lastIndexOf('\n', at - 1) + 1) return raw.slice(p);
    }
    p = raw.lastIndexOf('\n', at - 1) + 1;
    return p > 0 ? raw.slice(p) : 0;
  }
};
document.addEventListener('pointerdown', function(e) { return;
  var t = e.target;
  if (t.tagName === 'BUTTON' || t.closest('button') || t.tagName === 'A' || t.closest('a') || t.closest('[class$="-box"]')) {
    buzz(15);
  }
});

String.prompts = function(t){
  var raw = '' + t;
  var ansi = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  var map = [], flat = '', m, last = 0, i;
  ansi.lastIndex = 0;
  while((m = ansi.exec(raw))){
    for(i = last; i < m.index; i++){ map.push(i); flat += raw.charAt(i) }
    last = ansi.lastIndex;
  }
  for(i = last; i < raw.length; i++){ map.push(i); flat += raw.charAt(i) }
  map.push(raw.length);

  var at = [], from = 0, n, line, check, hit, rawAt, look;
  for(n = 0; n <= flat.length; n++){
    if(n !== flat.length && '\n' !== flat.charAt(n)) continue;
    line = flat.slice(from, n);
    check = line.cr ? line.cr() : line.replace(/\r/g, '');
    if(' ' === check.charAt(0) || '\t' === check.charAt(0)){ from = n + 1; continue }
    rawAt = from > 0 ? map[from - 1] + 1 : 0;
    look = raw.slice(Math.max(0, rawAt - 15), rawAt + 15);
    hit = String.hit(check, look);
    if(hit) at.push(rawAt);
    from = n + 1;
  }
  if(!at.length) return [raw];
  var out = [], j;
  for(j = 0; j < at.length; j++){
    out.push(raw.slice(at[j], j + 1 < at.length ? at[j + 1] : raw.length));
  }
  return out;
};

String.prototype.splitPrompts = function(){
  return String.prompts(this);
};

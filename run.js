;(function(T){
var C = shell.core;

T.keep = function(t, cmd){
  t.was = t.was || [];
  t.was.push(cmd);
  t.pos = t.was.length - 1;
  t.note = '';
};
T.run = function(eve, msg, to, from, t, cmd, raw, first, id, has, p){
  msg = eve.detail || eve.data || msg || {};
  msg = 'object' === typeof msg ? msg : {'$':msg};
  from = T.src(eve, msg);
  cmd = (msg.$ || msg.run || msg.cmd || (from && from.querySelector('prompt').textContent) || '').trim();
  if(!cmd){ return }
  has = null != msg['#'];
  id = has ? ('' + msg['#']).replace(/^#/, '') : '';
  if(has && !/^\d+$/.test(id)){ return }
  to = has ? '#' + id : msg.to || ((eve.type.match(/^prompt\.(back|next|pre|add)$/) || [])[1] || 'same');
  t = T.get(to, from);
  if(!t && !has){ t = from }
  if(!t){ return }
  first = !(t.was || []).length;
  if(first){ T.copy(t, t.previousElementSibling) }
  t.env = msg.env || t.env || '';
  raw = cmd;
  if(first && t.path){ raw = 'cd ' + T.arg(t.path) + ' && ' + raw }
  if(first && t.env){ raw = t.env + '; ' + raw }
  t.path = msg.path || msg.cwd || T.dir(t.path, cmd);
  t.open = 0;
  t.idle = 0;
  T.keep(t, cmd);
  t.bin = msg.bin || shell.head('$ ' + (msg.cmd || cmd)).bin;
  t.cmd = msg.cmd || cmd;
  t.show = msg.show || cmd;
  t.same = t === from;
  t.stay = msg.stay || 0;
  t.file = msg.file || '';
  p = t.querySelector('prompt');
  p.textContent = t.show;
  p.removeAttribute('contenteditable');
  T.at = shell.live = t;
  shell.used = 1;
  C.send(t, raw + '\r');
  screen.buzz();
  return t;
};
T.set = function(eve, msg, x){
  x = {};
  msg = eve.detail || eve.data || msg || {};
  msg = 'object' === typeof msg ? msg : {'$':msg};
  x.from = T.src(eve, msg);
  x.cmd = (msg.$ || msg.run || msg.cmd || '').trim();
  if(!x.cmd){ return }
  x.has = null != msg['#'];
  x.id = x.has ? ('' + msg['#']).replace(/^#/, '') : '';
  if(x.has && !/^\d+$/.test(x.id)){ return }
  x.hit = eve.type.match(/^prompt\.(back|next|pre|add)\.set$/);
  x.to = x.has ? '#' + x.id : msg.to || (x.hit ? x.hit[1] : 'same');
  x.task = T.get(x.to, x.from);
  if(!x.task && !x.has){ x.task = x.from }
  if(!x.task){ return }
  x.next = x.task.nextElementSibling;
  if(x.next && x.next.open && x.next.idle){ x.next.remove() }
  x.task.open = 1;
  x.task.idle = 0;
  x.task.bin = x.task.cmd = x.task.show = '';
  x.task.same = x.task.stay = 0;
  x.task.removeAttribute('bin');
  x.task.was = x.task.was || [];
  x.task.pos = x.task.was.length;
  x.task.note = x.cmd;
  x.raw = x.task.querySelector('raw');
  if(x.raw){ x.raw.textContent = '' }
  x.view = x.task.querySelector('iframe:not(.shut)') || x.task.querySelector('iframe');
  if(x.view){ x.view.classList.add('shut'); x.view.onload = null; x.view.removeAttribute('src') }
  if(shell.active === x.task){ shell.active = null }
  if(shell.live === x.task){ shell.live = null }
  x.ask = x.task.querySelector('prompt');
  x.ask.textContent = x.cmd;
  x.ask.setAttribute('contenteditable', 'true');
  T.at = x.task;
  (shell.$ = x.ask).focus();
  x.ran = document.createRange();
  x.ran.selectNodeContents(x.ask);
  x.ran.collapse(false);
  x.sel = getSelection();
  x.sel.removeAllRanges();
  x.sel.addRange(x.ran);
  return x.task;
};
kit.ear('prompt', T.run);
['back','next','pre','add'].forEach(function(to){ kit.ear('prompt.' + to, T.run) });
kit.ear('prompt.set', T.set);
['back','next','pre','add'].forEach(function(to){ kit.ear('prompt.' + to + '.set', T.set) });
}(shell.task));

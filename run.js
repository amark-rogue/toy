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
  to = has ? '#' + id : msg.to || (0 === eve.type.indexOf('prompt.') ? eve.type.slice(7) : 'same');
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
};
T.edit = function(eve, msg, from, t, p){
  msg = eve.detail || eve.data || '';
  if(!msg){ return }
  from = T.src(eve, {});
  t = T.get('add', from) || from;
  p = t.querySelector('prompt');
  p.textContent = msg;
  (shell.$ = p).focus();
};
['back','next','pre','add'].forEach(function(to){ kit.ear('prompt.' + to, T.run) });
}(shell.task));

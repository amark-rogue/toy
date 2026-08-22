shell.task = function(cmd, type){ return shell.task.open(cmd, type) };
;(function(T){
var C = shell.core, root = C.root;

T.at = root.querySelector('task');
T.type = function(type, set){
  type = type || 'prompt';
  if(0 !== type.indexOf('prompt')){ type = 'prompt.' + type }
  if(set && '.set' !== type.slice(-4)){ type += '.set' }
  return type;
};
T.open = function(cmd, type, from, t){
  from = from || T.at || (shell.$ && shell.$.closest && shell.$.closest('task'));
  t = T.run({type:T.type(type), target:from || root, detail:{'$':cmd, from:from}});
  return T.ref(t);
};
T.fill = function(cmd, type, from, t){
  from = from || T.at || (shell.$ && shell.$.closest && shell.$.closest('task'));
  t = T.set({type:T.type(type, 1), target:from || root, detail:{'$':cmd, from:from}});
  return T.ref(t);
};
T.ref = function(t, hand){
  if(!t){ return }
  if(t.hand){ return t.hand }
  hand = {id:(t.getAttribute && t.getAttribute('no')) || t.job || ''};
  hand.run = function(cmd, type){ return T.open(cmd, type, t) };
  hand.set = function(cmd, type){ return T.fill(cmd, type, t) };
  t.hand = hand;
  return hand;
};
T.src = function(eve, msg, t){
  t = msg.from && msg.from.matches && msg.from.matches('task') ? msg.from : 0;
  t = t || (eve.target.closest && eve.target.closest('task'));
  return t || T.at || (shell.$ && shell.$.closest('task'));
};
T.copy = function(t, from){
  if(!t || !from){ return t }
  t.path = from.path || '';
  t.env = from.env || '';
  return t;
};
T.dir = function(now, cmd, hit, path, root, out){
  hit = ('' + cmd).match(/(?:^|&&|[;|])\s*cd(?:\s+((?:\\.|'[^']*'|"[^"]*"|[^;&|\s])+))?(?:\s*(?:&&|[;|]|$))/);
  if(!hit){ return now || '' }
  path = hit[1] || '~';
  if(("'" === path.charAt(0) && "'" === path.slice(-1)) || ('"' === path.charAt(0) && '"' === path.slice(-1))){ path = path.slice(1, -1) }
  path = path.replace(/\\(.)/g, '$1');
  if('-' === path || 0 <= path.indexOf('$') || 0 <= path.indexOf('*')){ return now || '' }
  if('~' !== path && 0 !== path.indexOf('~/') && '/' !== path.charAt(0)){ path = (now || '~') + '/' + path }
  root = '/' === path.charAt(0) ? '/' : '';
  out = [];
  path.split('/').forEach(function(bit){
    if(!bit || '.' === bit){ return }
    if('..' === bit){ if(out.length && '~' !== out[out.length - 1]){ out.pop() } return }
    out.push(bit);
  });
  return root + out.join('/') || root || '~';
};
T.get = function(to, from, t, at){
  if(!to || 'same' === to){ return from }
  if('back' === to){ return from && from.previousElementSibling }
  if('next' === to){ return from && from.nextElementSibling }
  if('pre' !== to && 'add' !== to){
    return root.querySelector('task[no="' + ('' + to).replace(/^#/, '').replace(/"/g, '') + '"]');
  }
  if('add' === to && from.open && from.idle){ return from }
  if('add' === to && from.nextElementSibling && from.nextElementSibling.open){ return T.copy(from.nextElementSibling, from) }
  t = C.make();
  at = 'pre' === to ? from : from.nextElementSibling;
  from.parentNode.insertBefore(t, at);
  return T.copy(t, 'pre' === to ? t.previousElementSibling : from);
};
T.arg = function(s){ return ('' + s).replace(/[^\w@%+=:,./~-]/g, '\\$&') };
}(shell.task));

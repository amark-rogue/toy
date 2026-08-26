// One nested shell shares the outer task's live PTY.

;(function(SSH){
kit.createServer(function(req, res){
  SSH.open(SSH.text(req.body));
  res.send(kit.bind(document, {head:SSH.head}));
});

SSH.q = [];
SSH.on = null;
SSH.id = '';
SSH.buf = '';
SSH.head = '';

SSH.text = function(raw){
  if(raw && 'object' === typeof raw){ raw = raw.raw || raw.$ || '' }
  return '' + (raw || '');
};

// A shell inside this component owns its UI events. Keep them from also
// reaching the outer shell; only its rewritten host bytes cross that border.
SSH.local = function(eve){
  if(eve.target !== nest){ return }
  eve.preventDefault(); eve.stopImmediatePropagation();
};
('prompt prompt.add prompt.back prompt.next prompt.pre prompt.set prompt.add.set prompt.back.set prompt.next.set prompt.pre.set ' +
  'belt clear chat term.open term.close aid aid.ok aid.stop ls.hide open fetch git claude gemini').split(' ').forEach(function(type){
  nest.ear(type, SSH.local);
});

SSH.open = function(raw, all){
  if(SSH.up){ return }
  SSH.up = 1;
  all = raw.flat().split(/\r\n|\n|\r/);
  SSH.head = all.slice(1, -1).join('\n').trim();
  kit.say({mode:'shell'}, 'term.open');
};

SSH.ask = function(eve, msg, one){
  if(eve.target !== nest){ return }
  eve.preventDefault(); eve.stopImmediatePropagation();
  msg = eve.detail || eve.data || {};
  msg = 'object' === typeof msg ? msg : {'$':msg};
  if(msg.size){ kit.say({size:msg.size}, 'host'); return }
  one = {id:'' + (msg['#'] || SSH.id || ''), raw:'' + (msg.$ || '')};
  if(SSH.on && SSH.on.id === one.id){ kit.say(one.raw, 'host'); return }
  SSH.q.push(one); SSH.next();
};

SSH.next = function(){
  if(SSH.on || !SSH.q.length){ return }
  SSH.on = SSH.q.shift(); SSH.id = SSH.on.id; SSH.buf = '';
  SSH.on.end = /^(?:exit|logout)\s*$/i.test(SSH.on.raw.trim()) || '\u0004' === SSH.on.raw;
  kit.say(SSH.on.raw, 'host');
};

SSH.done = function(raw, all, line, hit){
  SSH.buf = (SSH.buf + raw).slice(-8192);
  all = SSH.buf.flat().split(/\r\n|\n|\r/); line = all[all.length - 1] || '';
  hit = String.hit(line) || String.tail(line);
  return !!(hit && !(hit.cmd || '').trim());
};

SSH.term = function(eve, raw, one, end){
  raw = SSH.text(eve.detail || eve.data); one = SSH.on;
  if(!one){ return }
  kit.say(JSON.stringify({'#':one.id, '$':raw}), 'chat', nest);
  if(!SSH.done(raw)){ return }
  end = one.end || /(?:Connection (?:to .* )?closed|Connection reset|Broken pipe)/i.test(SSH.buf);
  SSH.on = null; SSH.buf = '';
  if(end){ kit.say('', 'term.close'); return }
  SSH.next();
};

kit.ear('host', SSH.ask);
kit.ear('term', SSH.term);
}(window.SSH = {}));

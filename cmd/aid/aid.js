// Browser agent route. Parts load only after the first aid command.

window.aid = window.aid || {};

;(function(){
if(aid.boot){ return }
aid.boot = 1;
aid.got = {};
aid.no = 0;
aid.base = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
aid.part = [
  'key', 'free', 'sse', 'open', 'anth', 'wire', 'live', 'net', 'store', 'role', 'mem', 'todo', 'past', 'diff', 'ctx', 'ask',
  'use', 'disk', 'seek', 'snap', 'read', 'find', 'edit', 'sh',
  'web', 'task', 'scan', 'tool', 'view', 'loop', 'start', 'run'
];

aid.one = function(name){
  if(aid.got[name]){ return aid.got[name] }
  if(!/^[a-z]+$/.test(name)){ return Promise.reject(Error('bad part')) }
  return (aid.got[name] = new Promise(function(win, lose){
    var s = document.createElement('script');
    s.src = aid.base + name + '.js';
    s.onload = function(){ win(1) };
    s.onerror = function(){ aid.got[name] = 0; lose(Error('no ' + name)) };
    document.head.pin(s);
  }));
};

aid.pref = function(){
  aid.part.forEach(function(name){
    // The FreeLLM directory stays completely cold until an AID user asks for it.
    if('free' === name || aid.got[name]){ return }
    var link = document.createElement('link'); link.rel = 'prefetch'; link.as = 'script'; link.href = aid.base + name + '.js';
    document.head.pin(link);
  });
};

aid.cut = function(cmd){
  var out = [], text = '', q = '', slash = 0, i, c;
  for(i = 0; i < cmd.length; i++){
    c = cmd.charAt(i);
    if(q){
      text += c;
      if(slash){ slash = 0 }
      else if('\\' === c && "'" !== q){ slash = 1 }
      else if(q === c){ q = '' }
      continue;
    }
    if('"' === c || "'" === c){ q = c; text += c; continue }
    if(';' === c){ out.push({text:text, and:0}); text = ''; continue }
    if('&' === c && '&' === cmd.charAt(i + 1)){ out.push({text:text, and:1}); text = ''; i += 1; continue }
    text += c;
  }
  if(text.trim() || !out.length){ out.push({text:text, and:0}) }
  return out;
};

aid.go = async function(cmd, emu){
  var bits = aid.cut(cmd), raw = '', i, got, ok = 1;
  if(!window.demo || !demo.ok){ VM.say('aid needs host: demo\r\n'); emu.serial0_send('\n'); return }
  try{
    for(i = 0; i < bits.length; i++){
      raw = bits[i].text.trim(); if(!raw){ continue } ok = 1;
      if(/^aid(?:\s|$)/i.test(raw)){
        await Promise.all(aid.part.map(aid.one));
        await aid.role.load();
        await aid.task(raw.replace(/^aid\b\s*/i, '').trim());
      } else {
        got = await demo.cmd.one(raw); ok = got.ok;
        if(got.out){ VM.say(got.out) }
      }
      if(!ok && bits[i].and){ break }
    }
  }catch(e){
    if(aid.fail){ aid.fail(e) }
    else { VM.say('aid: ' + (e.message || e) + '\r\n') }
  }
  emu.serial0_send('\n');
};

aid.plug = function(){
  if(!window.VM || !VM.cmd || !VM.cmd.routes){ return 0 }
  var made = 0;
  if(!aid.route){
    aid.route = {
      match:{test:function(cmd){ return !!window.demo && !!demo.ok && /(?:^|[;&]\s*)aid(?:\s|$)/i.test(cmd) }},
      run: function(cmd, emu){ return aid.go(cmd, emu) }
    };
    VM.cmd.routes.push(aid.route); made = 1;
  }
  kit.say([['aid', 'aid ']], 'belt');
  if(window.demo && demo.ok && !aid.warm && window.requestIdleCallback){ aid.warm = 1; requestIdleCallback(aid.pref, {timeout:3000}) }
  return made;
};
aid.plug();
}());

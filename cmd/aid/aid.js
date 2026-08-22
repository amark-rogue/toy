// aid — tiny coding agent for the demo shell + OPFS
// extends VM one way: adds one route, streams out through VM.say
// type: aid <task> · parts load from aid/<name>.js on first use

window.aid = {};

;(function(){
  var lS = localStorage;

  aid.on = 0;
  aid.max = 8;
  aid.got = {};
  aid.no = 0;

  // load one part once, same lazy pattern as demo.pod.one
  aid.one = function(name){
    if(aid.got[name]){ return aid.got[name] }
    if(!/^[a-z]+$/.test(name)){ return Promise.reject(Error('bad part')) }
    return (aid.got[name] = new Promise(function(win, lose){
      var s = document.createElement('script');
      s.src = 'aid/' + name + '.js';
      s.onload = function(){ win(1) };
      s.onerror = function(){ aid.got[name] = 0; lose(Error('no ' + name)) };
      document.head.appendChild(s);
    }));
  };

  aid.go = async function(cmd, emu){
    kit.say([['aid', 'aid ']], 'belt');
    if(!demo.ok){
      VM.say('aid needs host: demo\n');
      return emu.serial0_send('\n');
    }
    var bits = cmd.split(/\s*(?:&&|;)\s*/), ask = '', i;
    for(i = 0; i < bits.length; i++){
      if(/^aid\b/i.test(bits[i])){ ask = bits[i].replace(/^aid\b\s*/i, '') }
    }
    try{
      await Promise.all(['key','net','use','run'].map(aid.one));
      await aid.task(ask.trim());
    }catch(e){
      VM.say('aid: ' + (e.message || e) + '\r\n');
    }
    emu.serial0_send('\n');
  };

  // tasks inherit context, so the word may ride after cd .. &&
  VM.cmd.routes.push({
    match: /(?:^|[;&]\s*)aid(?:\s|$)/i,
    run: function(cmd, emu){ return aid.go(cmd, emu) }
  });

  kit.say([['aid', 'aid ']], 'belt');
}());

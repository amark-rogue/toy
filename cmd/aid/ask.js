// Human gates and questions use one request/reply event pair.

;(function(){
aid.ask = {wait:{}};

aid.ask.open = function(run, opt){
  opt = opt || {};
  var id = run.id + 'q' + (++run.ask), data = {
    id:id, say:opt.say || 'Continue?', gate:opt.kind || 'ask',
    pick:opt.pick || ['yes', 'no'], tool:opt.tool || '', job:run.job, secret:!!opt.secret
  };
  aid.emit(run, 'ask', data);
  return new Promise(function(win, lose){
    aid.ask.wait[id] = {win:win, lose:lose, run:run};
    if(run.ctl){ run.ctl.signal.addEventListener('abort', function(){
      if(!aid.ask.wait[id]){ return }
      delete aid.ask.wait[id]; lose(Error('stopped'));
    }, {once:true}) }
  });
};

aid.ask.perm = async function(run, call){
  var safe = {read:1, tree:1, find:1, diff:1, plan:1, ask:1};
  var gate = {past:1, web:1};
  var op = ((call.args || {}).op || '').toLowerCase();
  if('memo' === call.name && /^(?:list|find)$/.test(op)){ return 1 }
  if('todo' === call.name && (!op || 'list' === op)){ return 1 }
  if('role' === call.name && (!op || 'list' === op)){ return 1 }
  if('task' === call.name && 'work' !== (call.args || {}).mode){ return 1 }
  if(safe[call.name]){ return 1 }
  if('plan' === run.mode && !gate[call.name]){ return 0 }
  if('all' === run.mode || (run.allow || {})[call.name]){ return 1 }
  if('write' === call.name || 'edit' === call.name){ return 1 }
  var say = 'Allow ' + call.name + '?\n' + aid.cap(JSON.stringify(call.args || {}), 1200);
  var got = await aid.ask.open(run, {say:say, kind:'gate', pick:['once', 'session', 'deny'], tool:call.name});
  if('session' === got){ (run.allow = run.allow || {})[call.name] = 1; return 1 }
  return 'once' === got || 'yes' === got;
};

kit.ear('aid.ok', function(eve){
  var d = eve.detail || eve.data || {}, one = aid.ask.wait[d.id];
  if(!one){ return }
  delete aid.ask.wait[d.id];
  one.win(d.say || d.pick || 'no');
});

kit.ear('aid.stop', function(eve){
  var d = eve.detail || eve.data || {}, all = aid.live || {}, key, run;
  for(key in all){
    run = all[key];
    if(!d.job || d.job === run.job || d.id === run.id){ if(run.ctl){ run.ctl.abort() } }
  }
});
}());

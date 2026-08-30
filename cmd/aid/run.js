// CLI surface over the small agent primitives.

;(function(){
aid.list = async function(){
  var all = await aid.store.list(); if(!all.length){ return 'no saved aid sessions' }
  return all.slice(0, 30).map(function(run){
    return run.id + ' · ' + new Date(run.at).toLocaleString() + ' · ' + (run.role || 'auto') + ' · ' + run.cwd + '\n  ' + (run.title || '(untitled)');
  }).join('\n');
};
aid.resume = async function(raw){
  var all = raw.trim().split(/\s+/), id = all.shift() || '', run;
  if(id){ run = await aid.store.load(id) } else { run = await aid.store.last(demo.cwd) }
  if(!run){ aid.say('session not found: ' + (id || '(latest)')); return }
  if(!all.length){
    aid.emit(aid.wake(run), 'head', {say:'Session ' + run.id + ' · ' + (run.role || 'auto') + ' · ' + run.mode + ' · ' + run.cwd + '\n' + (run.title || ''), mode:run.mode, role:run.role}); return;
  }
  return aid.start(all.join(' '), {run:run});
};
aid.secret = async function(raw){
  var all = raw.trim().split(/\s+/), keep = 'keep' === (all[0] || '').toLowerCase(), name, run, key;
  if(keep){ all.shift() } if('ask' === (all[0] || '').toLowerCase()){ all.shift() }
  name = (all.shift() || aid.now()).toLowerCase();
  if(!aid.tab[name]){ aid.say('unknown provider: ' + name); return }
  run = {id:'key' + Date.now().toString(36), job:demo.id || '', ask:0, ctl:new AbortController()};
  aid.emit(run, 'head', {say:'Key · ' + aid.row(name).name});
  var live = run.job || run.id; aid.live[live] = run;
  try{ key = await aid.ask.open(run, {say:'Paste the ' + aid.row(name).name + ' key. It will ' + (keep ? 'stay in this browser.' : 'vanish when this tab closes.'), kind:'key', pick:[], secret:1}) }
  finally{ delete aid.live[live] }
  aid.key(name, key, keep); localStorage.aipro = name;
  aid.say('key saved for ' + name + (keep ? ' in this browser' : ' until this tab closes'));
};
aid.task = async function(raw){
  raw = (raw || '').trim(); var all = raw.split(/\s+/), cmd = (all.shift() || '').toLowerCase(), text, run, mode = 'work', one;
  if(!raw){
    aid.say('usage: aid <task>\naid plan|all <task> · aid /role [name or id]\naid /memo|/todo|/past ... · aid /list · aid /resume [id] [task] · aid /undo [id]\naid /status · aid /model (pick) or aid /model provider/model · aid /key [keep] [provider] <key>'); return;
  }
  if('/' === cmd.charAt(0) && 'key' === cmd.slice(1) && (1 === all.length && aid.tab[(all[0] || '').toLowerCase()] || /^(?:ask|keep)$/.test((all[0] || '').toLowerCase()) && all.length < 3)){
    return aid.secret(all.join(' '));
  }
  if('/' === cmd.charAt(0)){
    cmd = cmd.slice(1);
    raw = cmd + (all.length ? ' ' + all.join(' ') : '');
    all = raw.split(/\s+/); cmd = (all.shift() || '').toLowerCase();
    if('model' === cmd && !all.length){ aid.say(await aid.set()); return }
    if(/^(?:status|key|free|fall|model|url|use|catalog|providers)$/.test(cmd)){
      text = await aid.cfg(raw); if(null != text){ aid.say(text); return }
    }
    if('role' === cmd){ aid.say(await aid.role.cmd(all.join(' '))); return }
    if('memo' === cmd || 'memory' === cmd){ aid.say(await aid.mem.cmd(all.join(' '))); return }
    if('remember' === cmd){ aid.say(await aid.mem.act({op:'add', text:all.join(' ')})); return }
    if('forget' === cmd){ aid.say(await aid.mem.act({op:'drop', id:all[0]})); return }
    if('todo' === cmd){ aid.say(await aid.todo.cmd(all.join(' '))); return }
    if('past' === cmd){ aid.say(await aid.use.past({word:all.join(' ')})); return }
    if('list' === cmd || 'sessions' === cmd){ aid.say(await aid.list()); return }
    if('resume' === cmd){ return aid.resume(all.join(' ')) }
    if('undo' === cmd){
      run = all[0] ? await aid.store.load(all[0]) : await aid.store.last(demo.cwd);
      aid.say(run ? await aid.diff.back(aid.wake(run)) : 'no session to undo'); return;
    }
    if('stop' === cmd){
      Object.keys(aid.live).forEach(function(key){ if(aid.live[key].ctl){ aid.live[key].ctl.abort() } });
      aid.say('stop requested'); return;
    }
    aid.say('unknown aid action: /' + cmd); return;
  }

  all = raw.split(/\s+/);
  while(all.length){
    one = all[0].toLowerCase();
    if(/^(?:plan|all|work)$/.test(one)){ mode = one; all.shift(); continue }
    break;
  }
  raw = all.join(' ');
  if(!raw){ aid.say('aid ' + mode + ' needs a task'); return }
  return aid.start(raw, {mode:mode});
};
}());

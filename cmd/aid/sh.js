// Shell plus session-view tools.

;(function(){
aid.use = aid.use || {};
aid.use.sh = async function(arg, run, call){
  var line = ('' + (arg.line || '')).trim(), was, out = '', err = '', proc, tick, wait, secs, code = 0, bad, skip, got;
  if(!line){ return 'sh needs line' }
  was = await aid.disk.snap(run.cwd);
  try{
    if(aid.host && aid.host.on){
      run.ctl.signal.addEventListener('abort', aid.host.stop, {once:true});
      try{ got = await aid.host.run(line, run.cwd, arg.secs) }
      finally{ run.ctl.signal.removeEventListener('abort', aid.host.stop) }
      out = got.out; code = got.code;
    }
    else if(!demo.pod || !demo.pod.use(line) || !window.Worker){ out = await demo.cmd.run(line) }
    else {
      await demo.pod.prep(); await demo.pod.seed(); demo.pod.on = 1; demo.pod.mute = 0; demo.pod.watch();
      proc = await demo.pod.pod.spawn('sh', ['-lc', line], {cwd:run.cwd});
      proc.on('output', function(text){ out = aid.cap(out + text, 24000); aid.emit(run, 'tool', {id:call.id, name:'sh', say:aid.cap(out + err, 12000), live:1}) });
      proc.on('error', function(text){ err = aid.cap(err + text, 24000); aid.emit(run, 'tool', {id:call.id, name:'sh', say:aid.cap(out + err, 12000), live:1}) });
      proc.on('exit', function(n){ code = Number(n) || 0 });
      run.ctl.signal.addEventListener('abort', function(){ if(proc.kill){ proc.kill() } }, {once:true});
      secs = Math.max(1, Math.min(Number(arg.secs) || 60, 120));
      wait = new Promise(function(win, lose){ tick = setTimeout(function(){ if(proc.kill){ proc.kill() } lose(Error('command timed out after ' + secs + 's')) }, secs * 1000) });
      try{ await Promise.race([proc.completion, wait]) }finally{ clearTimeout(tick) }
    }
  }catch(e){ bad = e }
  skip = await aid.disk.chg(run, was);
  if(code){ err += (err ? '\n' : '') + '[exit ' + code + ']' }
  if(skip){ err += (err ? '\n' : '') + '[diff skipped ' + skip + ' large or binary files]' }
  if(bad){ throw Error((bad.message || bad) + (out || err ? '\n' + aid.cap(out + err, 4000) : '')) }
  return aid.cap(out + err, 24000) || '(no output)';
};
aid.use.diff = function(arg, run){ return aid.diff.all(run) };
aid.use.plan = function(arg, run){
  var set = arg.steps || arg.plan || [];
  if('string' === typeof set){ set = set.split(/\r?\n/).filter(Boolean) }
  run.plan = set.slice ? set.slice(0, 30) : []; aid.emit(run, 'plan', {plan:run.plan});
  return 'plan saved with ' + run.plan.length + ' steps';
};
aid.use.ask = async function(arg, run){
  return await aid.ask.open(run, {say:arg.say || arg.question || 'What should I do?', pick:arg.pick || []});
};
}());

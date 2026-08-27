// One durable session lifetime.

;(function(){
aid.start = async function(ask, opt){
  opt = opt || {}; var run = opt.run ? aid.wake(opt.run) : await aid.fresh(ask, opt.mode, opt.role), key, made, text;
  demo.cwd = run.cwd;
  if(opt.run){ run.msgs.push({role:'system', content:await aid.ctx.live(run)}) }
  if(ask){ run.msgs.push({role:'user', content:ask}); run.title = run.title || aid.cap(ask, 80) }
  key = run.job || run.id; aid.live[key] = run; aid.on += 1; aid.diff.begin(run);
  aid.emit(run, 'head', {say:(opt.run ? 'Resumed ' : '') + run.id + ' · ' + run.role + ' · ' + run.mode + ' · ' + run.cwd, mode:run.mode, role:run.role});
  await aid.store.save(run);
  try{
    text = await aid.loop(run); made = aid.diff.commit(run);
    if(made.length){ aid.emit(run, 'diff', {say:await aid.diff.all(run), files:made.length}) }
    aid.emit(run, 'done', {say:'Done · ' + run.step + ' tool steps' + (run.use.all ? ' · ' + run.use.all + ' tokens' : ''), pro:run.pro, model:run.model, use:run.use});
    await aid.store.save(run); return text;
  }catch(e){
    made = aid.diff.commit(run);
    if(made.length){ aid.emit(run, 'diff', {say:await aid.diff.all(run), files:made.length}) }
    await aid.store.save(run);
    if('stopped' === (e.message || e)){ aid.emit(run, 'done', {say:'Stopped'}) } else { aid.fail(e, run) }
    return '';
  }finally{ delete aid.live[key]; aid.on = Math.max(0, aid.on - 1) }
};
}());

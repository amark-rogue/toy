// A bounded child agent shares the folder but returns one result to its parent.

;(function(){
aid.use = aid.use || {};
aid.use.task = async function(arg, run){
  var ask = ('' + (arg.ask || '')).trim(), mode = 'work' === arg.mode ? 'work' : 'plan';
  var deep = (run.deep || 0) + 1, role = aid.role.pick(arg.role), child, text, bad, i, one;
  if(!ask){ return 'task needs ask' }
  if(2 < deep){ return 'delegation depth limit reached' }
  run.kids = (run.kids || 0) + 1; if(6 < run.kids){ return 'delegation count limit reached' }
  child = await aid.fresh(ask, mode, role, deep, run.cwd); child.up = run.id; child.job = run.job;
  if(run.ctl){ run.ctl.signal.addEventListener('abort', function(){ child.ctl.abort() }, {once:true}) }
  child.msgs.push({role:'user', content:ask}); aid.diff.begin(child);
  aid.emit(run, 'stat', {say:'Delegated to ' + role + ' · ' + mode});
  try{ text = await aid.loop(child) }catch(e){ bad = e }
  finally{
    for(i = 0; i < (child.work || []).length; i++){
      one = child.work[i]; aid.diff.note(run, one.path, one.before, one.after);
    }
    run.use.in += child.use.in || 0; run.use.out += child.use.out || 0; run.use.all += child.use.all || 0;
    await aid.store.save(child);
  }
  if(bad){ throw bad }
  return role + ' agent ' + child.id + ' · ' + child.step + ' tool steps\n' + text;
};
}());

// Turn journals provide readable diffs and one-step-at-a-time undo.

;(function(){
aid.diff = {};

aid.diff.begin = function(run){ run.work = run.work || [] };

aid.diff.note = function(run, path, before, after){
  if(!run){ return }
  run.base = run.base || {};
  if(!Object.prototype.hasOwnProperty.call(run.base, path)){ run.base[path] = before }
  run.work = run.work || [];
  var i, one;
  for(i = 0; i < run.work.length; i++){
    one = run.work[i];
    if(one.path === path){ one.after = after; return }
  }
  run.work.push({path:path, before:before, after:after});
};

aid.diff.commit = function(run){
  if(!run || !run.work || !run.work.length){ return [] }
  run.undo = run.undo || [];
  run.undo.push(run.work);
  while(run.undo.length > 20){ run.undo.shift() }
  var out = run.work; run.work = [];
  return out;
};

aid.diff.back = async function(run){
  var set = run && run.undo && run.undo.pop(), i, one;
  if(!set || !set.length){ return 'nothing to undo' }
  for(i = set.length - 1; i >= 0; i--){
    one = set[i];
    if(null == one.before){ await aid.disk.drop(one.path) }
    else { await aid.disk.put(one.path, one.before) }
  }
  await aid.store.save(run);
  return 'undid ' + set.map(function(one){ return one.path }).join(', ');
};

aid.diff.make = function(before, after, path){
  var old = null == before ? [] : ('' + before).split('\n');
  var now = null == after ? [] : ('' + after).split('\n');
  var a = 0, z = 0, out = ['--- ' + path, '+++ ' + path];
  while(a < old.length && a < now.length && old[a] === now[a]){ a += 1 }
  while(z < old.length - a && z < now.length - a && old[old.length - 1 - z] === now[now.length - 1 - z]){ z += 1 }
  out.push('@@ ' + (a + 1) + ' @@');
  old.slice(a, old.length - z).forEach(function(row){ out.push('-' + row) });
  now.slice(a, now.length - z).forEach(function(row){ out.push('+' + row) });
  return aid.cap(out.join('\n'), 12000);
};

aid.diff.all = async function(run){
  var base = run.base || {}, all = Object.keys(base), out = [], i, path, now;
  for(i = 0; i < all.length; i++){
    path = all[i];
    try{ now = await aid.disk.text(path) }catch(e){ now = null }
    if(now !== base[path]){ out.push(aid.diff.make(base[path], now, path)) }
  }
  return out.join('\n\n') || '(no changes)';
};
}());

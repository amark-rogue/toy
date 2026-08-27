// Small project map plus bounded, pair-safe conversation compaction.

;(function(){
aid.ctx = {};
aid.ctx.skip = {'.aid':1, '.git':1, 'node_modules':1, '.cache':1, '.npm':1, 'dist':1};

aid.ctx.tree = async function(run){
  var out = [], seen = 0, root = run.cwd.replace(/\/$/, '');
  var walk = async function(path, deep){
    var all, i, one, at;
    if(deep > 4 || seen > 400){ return }
    try{ all = await aid.disk.list(path) }catch(e){ return }
    for(i = 0; i < all.length && seen <= 400; i++){
      one = all[i]; if(aid.ctx.skip[one.name]){ continue }
      at = path.replace(/\/$/, '') + '/' + one.name;
      out.push(at.slice(root.length + 1) + ('directory' === one.kind ? '/' : ''));
      seen += 1;
      if('directory' === one.kind){ await walk(at, deep + 1) }
    }
  };
  await walk(run.cwd, 0);
  if(seen > 400){ out.push('...(tree cut)') }
  return out.join('\n') || '(empty)';
};

aid.ctx.guide = async function(run){
  var dirs = [], path = run.cwd, root = demo.root || demo.home, out = [], names = ['AGENTS.md', 'contributing.md', 'CLAUDE.md', 'GEMINI.md'], i, n, at, text;
  while(path && 0 === path.indexOf(root)){
    dirs.unshift(path);
    if(path === root){ break }
    path = demo.path.up(path);
  }
  for(i = 0; i < dirs.length; i++){
    for(n = 0; n < names.length; n++){
      at = dirs[i].replace(/\/$/, '') + '/' + names[n];
      try{
        text = await aid.disk.text(at);
        out.push('## ' + at + '\n' + aid.cap(text, 8000));
      }catch(e){}
    }
  }
  at = run.cwd.replace(/\/$/, '') + '/README.md';
  try{ out.push('## ' + at + '\n' + aid.cap(await aid.disk.text(at), 8000)) }catch(e){}
  return aid.cap(out.join('\n\n'), 24000);
};

aid.ctx.life = async function(){
  var got = await Promise.all([aid.mem.text(), aid.todo.text()]); return got.filter(Boolean).join('\n\n');
};

aid.ctx.time = function(){
  var now = new Date(), zone = '';
  try{ zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '' }catch(e){}
  return 'Local time: ' + now.toString() + (zone ? ' · ' + zone : '');
};

aid.ctx.live = async function(run){
  var life = await aid.ctx.life(); return 'Session resumed with current local context.\n' + aid.ctx.time() + '\nWorking folder: ' + run.cwd + (life ? '\n\n' + life : '');
};

aid.ctx.open = async function(run){
  var life = await aid.ctx.life(), base = aid.ctx.time() + '\nWorking folder: ' + run.cwd;
  var got = await Promise.all([aid.ctx.tree(run), aid.ctx.guide(run)]);
  return base + '\n\nProject tree:\n' + got[0] + (got[1] ? '\n\nProject guides:\n' + got[1] : '') + (life ? '\n\n' + life : '');
};

aid.ctx.size = function(msg){
  return msg.reduce(function(n, one){ return n + (one.content || '').length + JSON.stringify(one.calls || '').length }, 0);
};

aid.ctx.units = function(msg){
  var out = [], i = 1, set;
  while(i < msg.length){
    set = [msg[i++]];
    if('assistant' === set[0].role && set[0].calls){
      while(i < msg.length && 'tool' === msg[i].role){ set.push(msg[i++]) }
    }
    out.push(set);
  }
  return out;
};

aid.ctx.trim = function(run){
  if(aid.ctx.size(run.msgs) < 70000){ return 0 }
  var unit = aid.ctx.units(run.msgs), keep = [], drop = [], size = 0, i, set, text;
  for(i = unit.length - 1; i >= 0; i--){
    set = unit[i]; text = JSON.stringify(set);
    if(size + text.length < 48000){ keep.unshift(set); size += text.length }
    else { drop.unshift(set) }
  }
  text = drop.map(function(set){
    return set.map(function(one){
      var tag = one.role + (one.name ? ' ' + one.name : '');
      return tag + ': ' + aid.cap(one.content || JSON.stringify(one.calls || []), 600);
    }).join('\n');
  }).join('\n');
  run.sum = aid.cap((run.sum ? run.sum + '\n' : '') + text, 12000);
  run.msgs = [run.msgs[0], {role:'system', content:'Earlier context, compacted:\n' + run.sum}];
  keep.forEach(function(set){ run.msgs = run.msgs.concat(set) });
  return drop.length;
};
}());

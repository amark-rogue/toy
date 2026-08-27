// File reading and bounded tree listing tools.

;(function(){
aid.use = aid.use || {};
aid.use.read = async function(arg, run){
  var got = await aid.disk.seek(arg.path || '.', run), path = got.path, hit = got.hit, all, text, row, from, to, i, out = [], note = aid.disk.note(got);
  if(!hit){ throw Error(aid.disk.miss(got)) }
  if('directory' === hit.kind){
    all = await aid.disk.list(path);
    return note + (all.map(function(one){ return one.name + ('directory' === one.kind ? '/' : '') }).join('\n') || '(empty)');
  }
  text = await aid.disk.text(path); row = text.split('\n'); from = Math.max(1, Number(arg.line) || 1);
  to = Math.min(row.length, from + Math.max(1, Math.min(Number(arg.count) || 240, 500)) - 1);
  for(i = from; i <= to; i++){ out.push(i + ': ' + row[i - 1]) }
  if(to < row.length){ out.push('...(through line ' + to + ' of ' + row.length + ')') }
  return note + aid.cap(out.join('\n'), 24000);
};
aid.use.tree = async function(arg, run){
  var root = aid.disk.abs(arg.path || '.', run), out = [], seen = 0, max = Math.max(1, Math.min(Number(arg.deep) || 4, 8));
  var walk = async function(path, deep){
    var all = await aid.disk.list(path), i, one, at;
    for(i = 0; i < all.length && seen < 500; i++){
      one = all[i]; if(aid.ctx.skip[one.name]){ continue }
      at = path.replace(/\/$/, '') + '/' + one.name; seen += 1;
      out.push(at.slice(root.replace(/\/$/, '').length + 1) + ('directory' === one.kind ? '/' : ''));
      if('directory' === one.kind && deep < max){ await walk(at, deep + 1) }
    }
  };
  await walk(root, 0); if(500 <= seen){ out.push('...(tree cut)') }
  return out.join('\n') || '(empty)';
};
}());

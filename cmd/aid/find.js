// Recursive text search tool.

;(function(){
aid.use = aid.use || {};
aid.use.find = async function(arg, run){
  var word = '' + (arg.word || ''), got, root, out = [], low = word.toLowerCase(), hit, note;
  var scan = async function(at){
    var text, row, n;
    try{ text = await aid.disk.text(at) }catch(e){ return }
    row = text.split('\n');
    for(n = 0; n < row.length && out.length < 100; n++){
      if(0 <= row[n].toLowerCase().indexOf(low)){ out.push(at + ':' + (n + 1) + ': ' + aid.cap(row[n], 240)) }
    }
  };
  var walk = async function(path, deep){
    var all, i, one, at;
    if(deep > 8 || out.length >= 100){ return }
    all = await aid.disk.list(path);
    for(i = 0; i < all.length && out.length < 100; i++){
      one = all[i]; if(aid.ctx.skip[one.name]){ continue }
      at = path.replace(/\/$/, '') + '/' + one.name;
      if('directory' === one.kind){ await walk(at, deep + 1); continue }
      await scan(at);
    }
  };
  if(!word){ return 'find needs word' }
  got = await aid.disk.seek(arg.path || '.', run); root = got.path; hit = got.hit; note = aid.disk.note(got);
  if(!hit){ throw Error(aid.disk.miss(got)) }
  if('directory' === hit.kind){ await walk(root, 0) } else { await scan(root) }
  return note + (out.join('\n') || 'no hit');
};
}());

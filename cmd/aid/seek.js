// Bounded recovery for stale or incomplete read-only paths.

;(function(){
aid.disk = aid.disk || {};
aid.disk.seek = async function(raw, run){
  var ask = aid.disk.abs(raw || '.', run), hit = await aid.disk.hit(ask), root, name, low, all = [], seen = 0, many = 0, cut = 0;
  if(hit){ return {ask:ask, path:ask, hit:hit, all:all} }
  root = aid.disk.abs('.', run); name = ask.slice(ask.lastIndexOf('/') + 1);
  if(!name || '.' === name || '/' === ask){ return {ask:ask, path:ask, hit:null, all:all} }
  low = aid.host && 'ps' === aid.host.type ? name.toLowerCase() : name;
  var walk = async function(path, deep){
    var list, i, one, at, same;
    if(7 < deep || 600 <= seen){ cut = 1; return }
    try{ list = await aid.disk.list(path) }catch(e){ return }
    for(i = 0; i < list.length && 600 > seen; i++){
      one = list[i]; if(aid.ctx && aid.ctx.skip && aid.ctx.skip[one.name]){ continue }
      at = path.replace(/\/$/, '') + '/' + one.name; seen += 1;
      same = aid.host && 'ps' === aid.host.type ? one.name.toLowerCase() === low : one.name === low;
      if(same){ many += 1; if(8 > all.length){ all.push(at) } }
      if('directory' === one.kind){ await walk(at, deep + 1) }
    }
    if(i < list.length){ cut = 1 }
  };
  await walk(root, 0); all.sort();
  if(1 === many && !cut){
    hit = await aid.disk.hit(all[0]);
    if(hit){ return {ask:ask, path:all[0], hit:hit, all:all, move:1} }
  }
  return {ask:ask, path:ask, hit:null, all:all, many:many, cut:cut};
};

aid.disk.note = function(got){
  return got.move ? 'Resolved missing path ' + got.ask + ' to ' + got.path + '.\n' : '';
};

aid.disk.miss = function(got){
  var text = got.ask + ': no such file or directory';
  if(got.all.length){ text += '\nPossible matches:\n' + got.all.join('\n') }
  if(8 < got.many){ text += '\n...(' + (got.many - 8) + ' more matches)' }
  if(got.cut){ text += '\nSearch stopped at its project bound; use an exact path.' }
  return text;
};
}());

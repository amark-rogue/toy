// Bounded text snapshots discover shell-made changes safely.

;(function(){
aid.disk = aid.disk || {};
aid.disk.snap = async function(path){
  var out = {}, size = 0, seen = 0;
  var walk = async function(at, deep){
    var all, i, n, one, file, raw, buf, text, binary;
    if(deep > 8 || seen > 500 || size > 2000000){ return }
    try{ all = await aid.disk.list(at) }catch(e){ return }
    for(i = 0; i < all.length; i++){
      one = all[i]; if(aid.ctx.skip[one.name]){ continue }
      file = at.replace(/\/$/, '') + '/' + one.name; seen += 1;
      if('directory' === one.kind){ await walk(file, deep + 1); continue }
      try{
        raw = await aid.disk.read(file); buf = new Uint8Array(raw); binary = 0;
        for(n = 0; n < buf.length && n < 8192; n++){ if(!buf[n]){ binary = 1; break } }
        if(binary || 200000 < buf.length){ out[file] = {skip:1}; continue }
        text = new TextDecoder('utf-8').decode(raw); out[file] = text; size += text.length;
      }catch(e){}
      if(seen > 500 || size > 2000000){ return }
    }
  };
  await walk(path, 0); return out;
};
aid.disk.chg = async function(run, was){
  var now = await aid.disk.snap(run.cwd), all = {}, path, before, after, skip = 0;
  Object.keys(was).forEach(function(one){ all[one] = 1 }); Object.keys(now).forEach(function(one){ all[one] = 1 });
  for(path in all){
    before = Object.prototype.hasOwnProperty.call(was, path) ? was[path] : null;
    after = Object.prototype.hasOwnProperty.call(now, path) ? now[path] : null;
    if(before && before.skip || after && after.skip){ skip += 1; continue }
    if(before !== after){ aid.diff.note(run, path, before, after) }
  }
  return skip;
};
}());

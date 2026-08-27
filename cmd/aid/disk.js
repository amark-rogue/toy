// Sandboxed project paths over the current OPFS / Nodepod facade.

;(function(){
aid.disk = aid.disk || {};
aid.disk.abs = function(path, run){
  path = ('' + (path || '.')).trim() || '.'; var root = demo.root || demo.home, pre = '', out = [], all, i, one, low, base;
  if(aid.host && 'ps' === aid.host.type){ path = path.replace(/\\/g, '/') }
  if('~' === path){ path = demo.home }
  else if(0 === path.indexOf('~/')){ path = demo.home + path.slice(1) }
  else if('/' !== path.charAt(0) && !/^[a-z]:\//i.test(path)){ path = ((run && run.cwd) || demo.cwd).replace(/\/$/, '') + '/' + path }
  if(/^[a-z]:\//i.test(path)){ pre = path.slice(0, 2); path = path.slice(2) }
  else if('/' === path.charAt(0)){ pre = '/' }
  all = path.split('/');
  for(i = 0; i < all.length; i++){
    one = all[i]; if(!one || '.' === one){ continue }
    if('..' === one){ out.pop() } else { out.push(one) }
  }
  path = ('/' === pre ? '/' : pre ? pre + '/' : '/') + out.join('/');
  low = aid.host && 'ps' === aid.host.type ? path.toLowerCase() : path;
  base = function(at){ at = ('' + at).replace(/\/$/, ''); return aid.host && 'ps' === aid.host.type ? at.toLowerCase() : at };
  if(low !== base(demo.home) && 0 !== low.indexOf(base(demo.home) + '/') && low !== base(root) && 0 !== low.indexOf(base(root) + '/')){
    throw Error('path outside ' + root);
  }
  return path;
};
aid.disk.hit = function(path){ return aid.host && aid.host.on ? aid.host.hit(path) : demo.fs.exists(path) };
aid.disk.list = function(path){ return aid.host && aid.host.on ? aid.host.list(path) : demo.fs.list(path) };
aid.disk.read = function(path){ return aid.host && aid.host.on ? aid.host.read(path) : demo.fs.read(path) };
aid.disk.text = async function(path){ return new TextDecoder('utf-8').decode(await aid.disk.read(path)) };
aid.disk.put = function(path, text){ return aid.host && aid.host.on ? aid.host.put(path, text) : demo.fs.write(path, '' + (null == text ? '' : text)) };
aid.disk.drop = async function(path){
  var hit = await aid.disk.hit(path); if(!hit){ return }
  if(aid.host && aid.host.on){
    if(path === demo.home || '/' === path){ throw Error('refusing to remove host root') }
    return aid.host.drop(path);
  }
  if(demo.pod && demo.pod.on){ return demo.pod.pod.fs.rm(path, {recursive:true, force:true}) }
  return demo.opfs.rm(path, 1);
};
aid.disk.write = async function(run, path, text){
  var hit = await aid.disk.hit(path), before = null;
  if(hit && 'directory' === hit.kind){ throw Error(path + ': is a directory') }
  if(hit){ before = await aid.disk.text(path) }
  await aid.disk.put(path, text); aid.diff.note(run, path, before, '' + text); return before;
};
}());

// Keep the quick OPFS shell and the richer in-memory shell in sync.

;(function(pod){

demo.fs.mkdirp = function(path){
  if(pod.on) return pod.pod.fs.mkdir(path, {recursive: true});
  return demo.opfs.mkdirp(path);
};

demo.fs.write = function(path, data){
  if(pod.on) return pod.pod.fs.writeFile(path, pod.buf(data));
  return demo.opfs.write(path, data);
};

demo.fs.read = async function(path){
  if(!pod.on) return demo.opfs.read(path);
  var b = await pod.pod.fs.readFile(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};

demo.fs.exists = async function(path){
  if(!pod.on) return demo.opfs.exists(path);
  try{
    var s = await pod.pod.fs.stat(path);
    return {kind: s.isDirectory ? 'directory' : 'file'};
  }catch(e){ return null }
};

demo.fs.list = async function(path){
  if(!pod.on) return demo.opfs.list(path);
  var fs = pod.pod.fs;
  var all = await fs.readdir(path);
  var out = [];
  for(var i = 0; i < all.length; i++){
    var at = path.replace(/\/$/, '') + '/' + all[i];
    var s = await fs.stat(at);
    out.push({name: all[i], kind: s.isDirectory ? 'directory' : 'file'});
  }
  return out;
};

pod.walk = async function(path, bag, dirs){
  if(pod.drop(path)) return;
  var all = await demo.opfs.list(path);
  dirs.push(path);
  for(var i = 0; i < all.length; i++){
    var at = path.replace(/\/$/, '') + '/' + all[i].name;
    if(pod.drop(at)) continue;
    if('directory' === all[i].kind) await pod.walk(at, bag, dirs);
    else bag[at] = new Uint8Array(await demo.opfs.read(at));
  }
};

pod.seed = async function(){
  if(pod.sown && pod.rev === demo.rev){
    pod.term.setCwd(demo.cwd);
    return;
  }
  var rev = demo.rev;
  var bag = {}, dirs = [];
  await pod.walk(demo.home, bag, dirs);
  var fs = pod.pod.fs;
  pod.lock = 1;
  try{
    await fs.rm(demo.home, {recursive: true, force: true});
    for(var i = 0; i < dirs.length; i++) await fs.mkdir(dirs[i], {recursive: true});
    var all = Object.keys(bag);
    for(i = 0; i < all.length; i++) await fs.writeFile(all[i], bag[all[i]]);
    var hit = await fs.exists(demo.cwd);
    if(!hit) demo.cwd = demo.home;
    pod.term.setCwd(demo.cwd);
    pod.sown = 1;
    pod.rev = rev;
  }finally{
    pod.lock = 0;
  }
};

pod.copy = async function(path){
  if(!path || path === demo.home || pod.drop(path)) return;
  var fs = pod.pod.fs, stat = null, disk;
  try{ stat = await fs.stat(path) }catch(e){}
  disk = await demo.opfs.exists(path);
  if(!stat){
    if(disk) await demo.opfs.rm(path, 1);
    return;
  }
  if(stat.isDirectory){
    if(disk && 'directory' !== disk.kind) await demo.opfs.rm(path, 1);
    await demo.opfs.mkdirp(path);
    var list = await fs.readdir(path);
    var has = {}, i;
    for(i = 0; i < list.length; i++){
      has[list[i]] = 1;
      await pod.copy(path.replace(/\/$/, '') + '/' + list[i]);
    }
    var old = await demo.opfs.list(path);
    for(i = 0; i < old.length; i++){
      var at = path.replace(/\/$/, '') + '/' + old[i].name;
      if(!has[old[i].name] && !pod.drop(at)) await demo.opfs.rm(at, 1);
    }
    return;
  }
  if(disk && 'file' !== disk.kind) await demo.opfs.rm(path, 1);
  await demo.opfs.write(path, await fs.readFile(path));
};

pod.save = function(path){
  if(!pod.on || pod.lock || pod.drop(path)) return;
  pod.todo[path] = 1;
  if(pod.tick) return;
  pod.tick = pod.wait(pod.drain, 500);
};

pod.drain = async function(){
  pod.tick = 0;
  if(!pod.on) return;
  var all = Object.keys(pod.todo);
  pod.todo = {};
  for(var i = 0; i < all.length; i++){
    try{ await pod.copy(all[i]) }catch(e){}
  }
  if(Object.keys(pod.todo).length) pod.save(Object.keys(pod.todo)[0]);
};

pod.watch = function(){
  if(pod.see) return;
  pod.see = pod.pod.fs.watch(demo.home, {recursive: true}, function(eve, name){
    if(name) pod.save(demo.home + '/' + name);
  });
};

}(demo.pod));

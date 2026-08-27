// Durable agent sessions live outside the user's /root project tree.

;(function(){
aid.store = {root:'/.aid', line:Promise.resolve()};

aid.store.id = function(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
};

aid.store.path = function(name){
  if(!/^[a-z0-9]+$/i.test(name || '')){ throw Error('bad store name') }
  return aid.store.root + '/' + name + '.json';
};

aid.store.get = async function(name, fall){
  try{ return JSON.parse(aid.host && aid.host.on ? await aid.disk.text(aid.store.path(name)) : await demo.opfs.readText(aid.store.path(name))) }
  catch(e){ return fall }
};

aid.store.put = function(name, data){
  var path = aid.store.path(name), body = JSON.stringify(data);
  var save = async function(){
    if(aid.host && aid.host.on){ await aid.disk.put(path, body); return }
    var rev = demo.rev;
    try{ await demo.opfs.mkdirp(aid.store.root); await demo.opfs.write(path, body) }
    finally{ demo.rev = rev }
  };
  aid.store.line = aid.store.line.then(save, save); return aid.store.line;
};

aid.store.view = function(run){
  return {
    id:run.id, at:run.at || Date.now(), cwd:run.cwd, mode:run.mode, role:run.role || 'auto', deep:run.deep || 0, up:run.up || '',
    turn:run.turn || 0, step:run.step || 0, pro:run.pro || '', model:run.model || '',
    title:run.title || '', sum:run.sum || '', plan:run.plan || [], use:run.use || {},
    msgs:run.msgs || [], undo:run.undo || [], work:run.work || [], base:run.base || {}
  };
};

aid.store.save = function(run){
  if(!run || !run.id){ return Promise.resolve() }
  run.at = Date.now();
  return aid.store.put(run.id, aid.store.view(run));
};

aid.store.load = async function(id){
  if(!/^[a-z0-9]+$/i.test(id || '')){ return null }
  var run = await aid.store.get(id, null); return run && run.id ? run : null;
};

aid.store.list = async function(){
  var all, out = [], i, one;
  try{ all = aid.host && aid.host.on ? await aid.disk.list(aid.store.root) : await demo.opfs.list(aid.store.root) }catch(e){ return out }
  all = all.filter(function(row){ return 'file' === row.kind && /\.json$/.test(row.name) && !/^(?:mem|role|todo)\.json$/.test(row.name) });
  all.sort(function(a, b){ return a.name < b.name ? 1 : a.name > b.name ? -1 : 0 });
  for(i = 0; i < all.length && i < 100; i++){
    one = await aid.store.load(all[i].name.replace(/\.json$/, ''));
    if(one){ out.push(one) }
  }
  out.sort(function(a, b){ return (b.at || 0) - (a.at || 0) });
  return out;
};

aid.store.last = async function(cwd){
  var all = await aid.store.list(), i;
  for(i = 0; i < all.length; i++){
    if(!cwd || cwd === all[i].cwd){ return all[i] }
  }
  return null;
};
}());

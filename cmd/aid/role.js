// Persistent user-made role lenses. Auto is the only built-in role.

;(function(){
aid.role = {};
aid.role.auto = {
  id:'auto', name:'Auto',
  text:'Choose the useful mix of skills for this request. Own the outcome, not merely the next reply.'
};
aid.role.rows = [aid.role.auto];
aid.role.now = 'auto';
aid.role.tab = {auto:aid.role.auto.text};
aid.role.ready = 0;

aid.role.clip = function(text, size){ return ('' + (text || '')).trim().slice(0, size) };
aid.role.norm = function(one){
  one = one || {}; var id = aid.role.clip(one.id, 32), name = aid.role.clip(one.name, 80), text = aid.role.clip(one.text, 6000);
  if(!/^[a-z0-9]+$/i.test(id) || 'auto' === id || !name || !text){ return null }
  return {id:id, name:name, text:text, at:Number(one.at) || Date.now()};
};
aid.role.find = function(name){
  name = aid.role.clip(name && name.id || name, 80).toLowerCase(); if(!name){ return null }
  var rows = aid.role.rows, i, one;
  for(i = 0; i < rows.length; i++){
    one = rows[i]; if(name === one.id.toLowerCase() || name === one.name.toLowerCase()){ return one }
  }
  return null;
};
aid.role.fill = function(data){
  data = data || {}; var rows = Array.isArray(data) ? data : data.rows, seen = {auto:1}, all = [aid.role.auto], one, i;
  rows = Array.isArray(rows) ? rows : [];
  for(i = 0; i < rows.length && all.length < 65; i++){
    one = aid.role.norm(rows[i]); if(!one || seen[one.id]){ continue } seen[one.id] = 1; all.push(one);
  }
  aid.role.rows = all; aid.role.tab = {};
  all.forEach(function(row){ aid.role.tab[row.id] = row.text });
  one = aid.role.find(data.pick); aid.role.now = one ? one.id : 'auto';
  aid.role.ready = Promise.resolve(all); return all;
};
aid.role.load = function(){
  if(aid.role.ready){ return aid.role.ready }
  aid.role.ready = aid.store.get('role', {}).then(aid.role.fill); return aid.role.ready;
};
aid.role.pick = function(name){ var one = aid.role.find(name || aid.role.now); return one ? one.id : 'auto' };
aid.role.text = function(run){ var one = aid.role.find(run && run.role || aid.role.now); return (one || aid.role.auto).text };
}());

;(function(){
aid.role.keep = function(){
  return aid.store.put('role', {pick:aid.role.now, rows:aid.role.rows.slice(1)});
};
aid.role.save = async function(arg){
  arg = arg || {}; await aid.role.load();
  var name = aid.role.clip(arg.name, 80), text = aid.role.clip(arg.text, 6000), id;
  var one = aid.role.find(arg.id), same = aid.role.find(name);
  if(!name || !text){ throw Error('role needs name and text') }
  if(one && 'auto' === one.id){ throw Error('auto role cannot be changed') }
  if(same && 'auto' === same.id){ throw Error('auto role cannot be changed') }
  if(one && same && one.id !== same.id){ throw Error('role name already exists: ' + name) }
  one = one || same;
  if(one){ one.name = name; one.text = text; one.at = Date.now() }
  else {
    if(64 < aid.role.rows.length){ throw Error('role limit reached') }
    do{ id = aid.store.id().slice(-8) }while(aid.role.find(id));
    one = {id:id, name:name, text:text, at:Date.now()};
    aid.role.rows.push(one); aid.role.tab[one.id] = one.text;
  }
  if(arg.pick){ aid.role.now = one.id }
  await aid.role.keep(); return one;
};
aid.role.drop = async function(name){
  await aid.role.load(); var one = aid.role.find(name);
  if(!one || 'auto' === one.id){ throw Error('role not found: ' + (name || '')) }
  aid.role.fill({pick:one.id === aid.role.now ? 'auto' : aid.role.now, rows:aid.role.rows.filter(function(row){ return row.id !== one.id })});
  await aid.role.keep(); return one;
};
aid.role.set = async function(name){
  var one = aid.role.find(name); if(!one){ return '' }
  aid.role.now = one.id; await aid.role.keep(); return one.id;
};
aid.role.list = function(){
  return aid.role.rows.map(function(one){ return one.id + ' · ' + one.name }).join('\n');
};
aid.role.act = async function(arg){
  arg = arg || {}; var op = (arg.op || 'list').toLowerCase(), one;
  await aid.role.load();
  if('save' === op){ one = await aid.role.save(arg); return 'saved role ' + one.id + ' · ' + one.name }
  if('drop' === op){ one = await aid.role.drop(arg.id || arg.name); return 'dropped role ' + one.id + ' · ' + one.name }
  if('set' === op){
    one = aid.role.find(arg.id || arg.name); if(!one){ return 'role not found: ' + (arg.id || arg.name || '') }
    aid.role.now = one.id; await aid.role.keep(); return 'role: ' + one.id + ' · ' + one.name;
  }
  return 'role: ' + aid.role.now + '\nroles:\n' + aid.role.list();
};
aid.role.cmd = async function(raw){
  var name = aid.role.clip(raw, 80), one;
  if(!name){ return 'role: ' + aid.role.now + '\nroles:\n' + aid.role.list() }
  one = aid.role.find(name); if(!one){ return 'role not found: ' + name + '\nroles:\n' + aid.role.list() }
  await aid.role.set(one.id); return 'role: ' + one.id + ' · ' + one.name;
};
aid.use = aid.use || {};
aid.use.role = async function(arg, run){
  var out = await aid.role.act(arg), op = ((arg || {}).op || 'list').toLowerCase();
  if(run && /^(?:save|set|drop)$/.test(op)){ run.role = aid.role.pick() }
  return out;
};
}());

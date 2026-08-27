// Durable commitments with a tiny state and optional due date.

;(function(){
aid.todo = {};
aid.todo.all = async function(){
  var all = await aid.store.get('todo', []); return Array.isArray(all) ? all : [];
};
aid.todo.save = function(all){ return aid.store.put('todo', all.slice(-300)) };
aid.todo.late = function(one){
  var at = Date.parse(one.due || ''); return 'done' !== one.state && isFinite(at) && at < Date.now();
};
aid.todo.list = function(all){
  return all.map(function(one){ return one.id + ' · [' + one.state + (aid.todo.late(one) ? ' DUE' : '') + '] ' + one.text + (one.due ? ' · due ' + one.due : '') }).join('\n') || 'no open todos';
};
aid.todo.act = async function(arg){
  arg = arg || {}; var op = (arg.op || 'list').toLowerCase(), all = await aid.todo.all(), one, i, text;
  if('add' === op){
    text = ('' + (arg.text || '')).trim(); if(!text){ return 'todo add needs text' }
    one = {id:aid.store.id().slice(-8), at:Date.now(), state:'todo', text:aid.cap(text, 1200), due:('' + (arg.due || '')).trim()};
    all.push(one); await aid.todo.save(all); return 'added ' + aid.todo.list([one]);
  }
  if('drop' === op){
    i = -1; all.some(function(row, at){ if(row.id !== arg.id){ return false } i = at; return true });
    if(0 > i){ return 'todo not found: ' + (arg.id || '') }
    one = all.splice(i, 1)[0]; await aid.todo.save(all); return 'dropped ' + one.id;
  }
  if('set' === op || 'done' === op){
    all.some(function(row){ if(row.id !== arg.id){ return false } one = row; return true });
    if(!one){ return 'todo not found: ' + (arg.id || '') }
    if(arg.text){ one.text = aid.cap(('' + arg.text).trim(), 1200) }
    if(null != arg.due){ one.due = ('' + arg.due).trim() }
    one.state = 'done' === op ? 'done' : /^(?:todo|doing|done)$/.test(arg.state || '') ? arg.state : one.state;
    await aid.todo.save(all); return 'set ' + aid.todo.list([one]);
  }
  if(!arg.all){ all = all.filter(function(row){ return 'done' !== row.state }) }
  return aid.todo.list(all);
};
aid.todo.cmd = function(raw){
  var all = (raw || '').trim().split(/\s+/), op = (all.shift() || 'list').toLowerCase(), arg = {op:op};
  if('add' === op){ arg.text = all.join(' ') }
  else if('all' === op){ arg = {op:'list', all:true} }
  else if(/^(?:done|drop)$/.test(op)){ arg.id = all[0] }
  else if(/^(?:doing|todo)$/.test(op)){ arg = {op:'set', id:all[0], state:op} }
  else if('due' === op){ arg = {op:'set', id:all.shift(), due:all.join(' ')} }
  return aid.todo.act(arg);
};
aid.todo.text = async function(){
  var all = (await aid.todo.all()).filter(function(one){ return 'done' !== one.state });
  return all.length ? 'Open commitments:\n' + aid.cap(aid.todo.list(all), 6000) : '';
};
aid.use = aid.use || {}; aid.use.todo = function(arg){ return aid.todo.act(arg) };
}());

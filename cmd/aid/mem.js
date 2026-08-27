// Explicit durable facts, separate from project files and session transcripts.

;(function(){
aid.mem = {};
aid.mem.all = async function(){
  var all = await aid.store.get('mem', []); return Array.isArray(all) ? all : [];
};
aid.mem.save = function(all){ return aid.store.put('mem', all.slice(-200)) };
aid.mem.list = function(all){
  return all.map(function(one){ return one.id + ' · ' + one.text }).join('\n') || 'no saved memory';
};
aid.mem.act = async function(arg){
  arg = arg || {}; var op = (arg.op || 'list').toLowerCase(), all = await aid.mem.all(), text, word, keep;
  if('add' === op){
    text = ('' + (arg.text || '')).trim(); if(!text){ return 'memo add needs text' }
    keep = {id:aid.store.id().slice(-8), at:Date.now(), text:aid.cap(text, 1200)}; all.push(keep); await aid.mem.save(all);
    return 'remembered ' + keep.id + ' · ' + keep.text;
  }
  if('drop' === op){
    keep = all.filter(function(one){ return one.id !== arg.id });
    if(keep.length === all.length){ return 'memory not found: ' + (arg.id || '') }
    await aid.mem.save(keep); return 'forgot ' + arg.id;
  }
  if('find' === op){
    word = ('' + (arg.word || arg.text || '')).toLowerCase();
    return aid.mem.list(all.filter(function(one){ return !word || 0 <= one.text.toLowerCase().indexOf(word) }));
  }
  return aid.mem.list(all);
};
aid.mem.cmd = function(raw){
  var all = (raw || '').trim().split(/\s+/), op = (all.shift() || 'list').toLowerCase();
  if('forget' === op){ op = 'drop' }
  return aid.mem.act({op:op, id:'drop' === op ? all[0] : '', word:'find' === op ? all.join(' ') : '', text:'add' === op ? all.join(' ') : ''});
};
aid.mem.text = async function(){
  var all = await aid.mem.all(); return all.length ? 'Saved facts:\n' + aid.cap(aid.mem.list(all), 6000) : '';
};
aid.use = aid.use || {}; aid.use.memo = function(arg){ return aid.mem.act(arg) };
}());

// Search prior local sessions without exposing their store as project files.

;(function(){
aid.past = {};
aid.past.clip = function(text, word){
  text = '' + (text || ''); var at = text.toLowerCase().indexOf(word), from;
  if(0 > at){ return '' } from = Math.max(0, at - 100); return aid.cap(text.slice(from, at + word.length + 220).replace(/\s+/g, ' '), 360);
};
aid.use = aid.use || {};
aid.use.past = async function(arg){
  var word = ('' + (arg.word || '')).trim().toLowerCase(), max = Math.max(1, Math.min(Number(arg.count) || 10, 20));
  var all = await aid.store.list(), out = [], i, one, msg, hit;
  for(i = 0; i < all.length && out.length < max; i++){
    one = all[i]; msg = aid.cap((one.msgs || []).map(function(row){ return row.content || '' }).join('\n'), 30000);
    hit = !word ? one.title || one.sum || msg : aid.past.clip([one.title, one.sum, msg].join('\n'), word);
    if(hit){ out.push(one.id + ' · ' + new Date(one.at).toLocaleString() + ' · ' + (one.role || 'auto') + '\n' + aid.cap(hit, 500)) }
  }
  return out.join('\n\n') || 'no matching session';
};
}());

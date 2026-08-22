// run — the loop: ask, scan for one tool, act, feed back; prose ends it
// the json tool protocol works over every shape in net, keys or none

;(function(){
var MOST = 8, HOLD = 14, CAPOUT = 6000;
// stream one line into the live task: json like every chat frame, typed for the aid view
aid.say = function(text){
  var msg = {type: 'aid', say: ('' + text).replace(/\r?\n/g, '\r\n'), n: ++aid.no};
  if(demo.id){ msg['#'] = demo.id }
  kit.say(JSON.stringify(msg), 'chat');
};
// pull one tool out of a reply: fenced, whole body, or bare json after prose
aid.scan = function(text){
  var obj, at, open, deep, i, c, q;
  text = '' + (text || '');
  aid.note = '';
  at = text.indexOf('"tool"');
  if(0 > at){ return null }
  open = text.lastIndexOf('{', at);
  if(0 > open){ return null }
  deep = 0;
  q = '';
  for(i = open; i < text.length; i++){
    c = text.charAt(i);
    if(q){
      if('\\' === c){ i += 1 }
      else if(q === c){ q = '' }
      continue;
    }
    if('"' === c){ q = c; continue }
    if('{' === c){ deep += 1 }
    else if('}' === c){
      deep -= 1;
      if(!deep){
        try{ obj = JSON.parse(text.slice(open, i + 1)) }catch(e){ return null }
        if(!obj.tool){ return null }
        aid.note = text.slice(0, open).replace(/\s+$/, '').replace(/```\w*$/, '').trim();
        return obj;
      }
    }
  }
  return null;
};
function lead(){
  return [
    'You are aid, a coding agent inside a phone browser shell.',
    'Files sit on a small sandbox disk. Folder now: ' + (demo.cwd || demo.home),
    'Each turn reply with plain prose OR exactly one tool:',
    '{"tool":"read","path":"file or folder"}',
    '{"tool":"find","word":"text","path":"folder"}',
    '{"tool":"save","path":"file","text":"whole new file body"}',
    '{"tool":"sh","line":"one shell line"}',
    'After a tool you get its result, then reply again.',
    'When the task is done reply with plain prose only.',
    'Ladder before you build: needed? already here? builtin? native? smallest change?',
    'Never invent paths without listing or reading first.',
    'Saved files must be complete and runnable, no placeholders, no ``` inside.'
  ].join('\n');
}
async function step(tool){
  var fn = aid.use[tool.tool];
  aid.say('(' + tool.tool + ' ' + (tool.path || tool.word || tool.line || '') + ')');
  if(!fn){ return 'bad tool, use read find save sh' }
  try{ return await fn(tool) }catch(e){ return e.message || e }
}
// aid <task> · aid key [paste | provider | free]
aid.task = async function(ask){
  var word = ask.split(/\s+/)[0] || '';
  if(!ask){
    aid.say('usage: aid <task>\naid key [paste key | provider | free]');
    return;
  }
  if('key' === word.toLowerCase()){
    aid.say(await aid.key(ask.slice(word.length)));
    return;
  }
  var talk = [
    {role: 'system', content: lead()},
    {role: 'user', content: ask}
  ];
  aid.on = 1;
  try{
    for(var n = 0; n < MOST; n++){
      var out = await aid.call(talk);
      var tool = aid.scan(out);
      if(!tool){ return aid.say(aid.cap(out, CAPOUT)) }
      if(aid.note){ aid.say(aid.note) } // any intent line before the tool
      var got = await step(tool);
      talk.push({role: 'assistant', content: out});
      talk.push({role: 'user', content: 'tool result:\n' + got});
      while(talk.length > HOLD){ talk.splice(2, 2) }
    }
    aid.say('stopped after ' + MOST + ' steps');
  }finally{ aid.on = 0 }
};
}());

// Provider catalog and browser-local credential choices.

;(function(){
var lS = localStorage, sS = {}, pre = 'aid.key.';
try{ sS = window.sessionStorage || {} }catch(e){}

aid.tab = {
  chat: {name:'ch.at', url:'https://ch.at/v1/chat/completions', make:'open', free:1},
  ollama: {name:'Ollama', url:'http://localhost:11434/v1/chat/completions', make:'open', tool:1, model:'llama3'},
  router: {name:'OpenRouter', url:'https://openrouter.ai/api/v1/chat/completions', make:'open', tool:1, model:'openrouter/free', auth:'bear', head:{'X-Title':'TOY aid'}},
  zen: {name:'OpenCode Zen', url:'https://opencode.ai/zen/v1/chat/completions', make:'open', model:'x-preview-f-free', auth:'bear', cors:0, block:'OpenCode Zen blocks direct static-page requests; use aid url with your own CORS proxy'},
  groq: {name:'Groq', url:'https://api.groq.com/openai/v1/chat/completions', make:'open', tool:1, model:'llama-3.3-70b-versatile', auth:'bear'},
  openai: {name:'OpenAI', url:'https://api.openai.com/v1/chat/completions', make:'open', tool:1, model:'gpt-4o-mini', auth:'bear'},
  anth: {name:'Anthropic', url:'https://api.anthropic.com/v1/messages', make:'anth', tool:1, model:'claude-haiku-4-5', auth:'xkey'},
  gemini: {name:'Gemini', url:'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', make:'open', tool:1, model:'gemini-2.5-flash', auth:'bear'},
  custom: {name:'Custom', url:'', make:'open', auth:'may'}
};
aid.free = ['chat'];

aid.pick = function(key){
  key = key || '';
  if(/^sk-or-/.test(key)){ return 'router' }
  if(/^sk-ant-/.test(key)){ return 'anth' }
  if(/^gsk_/.test(key)){ return 'groq' }
  if(/^AIza/.test(key)){ return 'gemini' }
  if(/^sk-/.test(key)){ return 'openai' }
  return '';
};
aid.key = function(name, val, keep){
  name = name || aid.now();
  if(undefined === val){
    return sS[pre + name] || localStorage[pre + name] || (aid.pick(localStorage.aikey || '') === name ? localStorage.aikey : '') || '';
  }
  if(val){ sS[pre + name] = val }
  else { try{ delete sS[pre + name] }catch(e){} }
  if(keep && val){ localStorage[pre + name] = val }
  if(!val || !keep){ delete localStorage[pre + name] }
  return val;
};
aid.now = function(){ return lS.aipro || aid.pick(lS.aikey || '') || aid.free[0] };
aid.row = function(name){ return aid.tab[name || aid.hit || aid.now()] || aid.tab.chat };
aid.url = function(name){
  var row = aid.row(name);
  return ('custom' === (name || aid.hit || aid.now()) ? lS.aipi : '') || row.url;
};
aid.model = function(name){ return lS.aimodel || aid.row(name).model || '' };
aid.chain = function(){
  var first = aid.now(), out = [first], i;
  if(aid.fall()){
    for(i = 0; i < aid.free.length; i++){
      if(first !== aid.free[i]){ out.push(aid.free[i]) }
    }
  }
  return out;
};
aid.fall = function(on){
  if(undefined !== on){ lS.aifall = on ? 'on' : 'off' }
  return 'off' !== lS.aifall;
};
aid.mask = function(key){ return key ? key.slice(0, 6) + '...' + key.slice(-3) : '(none)' };

aid.cfg = async function(raw){
  var all = raw.trim().split(/\s+/), cmd = (all.shift() || '').toLowerCase(), name, key, keep;
  if('status' === cmd || 'key' === cmd && !all.length){
    name = aid.now();
    return 'provider: ' + name + ' (' + aid.row(name).name + ')\nmodel: ' + (aid.model(name) || '(service own)')
      + '\nkey: ' + aid.mask(aid.key(name)) + '\nfallback: ' + (aid.fall() ? aid.free.join(', ') : 'off')
      + '\nrole: ' + (aid.role ? aid.role.pick() : 'auto')
      + '\nsession keys vanish when this tab closes\nproviders: ' + Object.keys(aid.tab).join(' ');
  }
  if('free' === cmd || 'key' === cmd && 'free' === all[0]){
    delete lS.aipro; delete lS.aikey; delete lS.aimodel; delete lS.aipi;
    return 'free provider: chat';
  }
  if('fall' === cmd){ aid.fall('off' !== (all[0] || '').toLowerCase()); return 'fallback: ' + (aid.fall() ? 'on' : 'off') }
  if('model' === cmd){ lS.aimodel = all.join(' '); return 'model: ' + (lS.aimodel || '(provider default)') }
  if('url' === cmd){ lS.aipi = all.shift() || ''; lS.aipro = 'custom'; if(all.length){ lS.aimodel = all.join(' ') } return 'custom URL: ' + (lS.aipi || '(none)') }
  if('use' === cmd){
    name = (all.shift() || '').toLowerCase();
    if(!aid.tab[name]){ return 'unknown provider: ' + name }
    lS.aipro = name; if(all.length){ lS.aimodel = all.join(' ') }
    return 'provider: ' + name + '\nmodel: ' + (aid.model(name) || '(service own)');
  }
  if('key' !== cmd){ return null }
  keep = 'keep' === (all[0] || '').toLowerCase(); if(keep){ all.shift() }
  if('forget' === (all[0] || '').toLowerCase()){
    all.shift(); name = (all.shift() || aid.now()).toLowerCase(); aid.key(name, '');
    return 'forgot key: ' + name;
  }
  name = (all[0] || '').toLowerCase();
  if(aid.tab[name]){ all.shift() } else { name = aid.pick(all[0] || '') || aid.now() }
  key = all.join(' ');
  if(!key){ lS.aipro = name; return 'provider: ' + name + '\nkey: ' + aid.mask(aid.key(name)) }
  aid.key(name, key, keep); lS.aipro = name; delete lS.aikey;
  return 'key saved for ' + name + (keep ? ' in this browser' : ' until this tab closes');
};
}());

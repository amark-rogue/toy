// Provider catalog and browser-local credential choices.

;(function(){
var lS = localStorage, sS = {}, pre = 'aid.key.';
try{ sS = window.sessionStorage || {} }catch(e){}

aid.tab = {
  chat: {name:'ch.at', url:'https://ch.at/v1/chat/completions', make:'open', free:1, anon:1, tag:'anonymous, free', models:[]},
  ollama: {name:'Ollama', url:'http://localhost:11434/v1/chat/completions', make:'open', tool:1, model:'llama3', anon:1, tag:'local, free', models:['llama3']},
  router: {name:'OpenRouter', url:'https://openrouter.ai/api/v1/chat/completions', make:'open', tool:1, model:'openrouter/free', auth:'bear', head:{'X-Title':'TOY aid'}, tag:'free model, needs key', models:['openrouter/free']},
  zen: {name:'OpenCode Zen', url:'https://opencode.ai/zen/v1/chat/completions', make:'open', model:'x-preview-f-free', auth:'bear', cors:0, block:'OpenCode Zen blocks direct static-page requests; use aid url with your own CORS proxy', tag:'free model, needs key', models:['x-preview-f-free']},
  groq: {name:'Groq', url:'https://api.groq.com/openai/v1/chat/completions', make:'open', tool:1, model:'llama-3.3-70b-versatile', auth:'bear', tag:'free tier, needs key', models:['llama-3.3-70b-versatile']},
  openai: {name:'OpenAI', url:'https://api.openai.com/v1/chat/completions', make:'open', tool:1, model:'gpt-4o-mini', auth:'bear', cost:1, tag:'paid, needs key', models:['gpt-4o-mini']},
  anth: {name:'Anthropic', url:'https://api.anthropic.com/v1/messages', make:'anth', tool:1, model:'claude-haiku-4-5', auth:'xkey', cost:1, tag:'paid, needs key', models:['claude-haiku-4-5']},
  gemini: {name:'Gemini', url:'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', make:'open', tool:1, model:'gemini-2.5-flash', auth:'bear', tag:'free tier, needs key', models:['gemini-2.5-flash']},
  custom: {name:'Custom', url:'', make:'open', auth:'may', cost:1, tag:'your own endpoint', models:[]}
};
aid.free = ['chat'];

// Providers first by how the user can reach them: ch.at first, then other
// free & anonymous ones, then free models that still need a key, then paid.
aid.cat = function(name){
  var row = aid.tab[name]; if(!row){ return 9 }
  if('chat' === name || row.anon){ return 'chat' === name ? 0 : 1 }
  return row.cost ? 3 : 2;
};
aid.order = function(){
  var ids = Object.keys(aid.tab), named = {chat:'A', ollama:'B', router:'C', zen:'D', groq:'E', gemini:'F', openai:'G', anth:'H', custom:'Z'};
  return ids.sort(function(a, b){
    var c = aid.cat(a) - aid.cat(b); if(c){ return c }
    return (named[a] || a) < (named[b] || b) ? -1 : 1;
  });
};

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

aid.wait = function(run, tag){
  var id = run.id + tag + (++run.ask);
  aid.emit(run, 'ask', Object.assign({id:id, job:run.job}, arguments[2] || {}));
  return new Promise(function(win, lose){
    aid.ask.wait[id] = {win:win, lose:lose, run:run};
    if(run.ctl){ run.ctl.signal.addEventListener('abort', function(){ if(aid.ask.wait[id]){ delete aid.ask.wait[id]; lose(Error('stopped')) } }, {once:true}) }
  });
};

// Interactive `aid /model`: pick a provider first (since models depend on it),
// set a key if that provider needs one, then pick a model. Returns the summary
// text. Unifies /free, /catalog, /providers, /model, and /use into one flow.
aid.set = async function(){
  var one = aid.now(), run = {id:'pick' + Date.now().toString(36), job:demo.id || '', ask:0, ctl:new AbortController()};
  aid.live[run.job || run.id] = run;
  aid.emit(run, 'head', {say:'/model · pick a provider'});
  try{
    var pick = aid.order().map(function(name){
      var row = aid.tab[name], have = aid.key(name);
      return name + ' · ' + row.name + (have ? ' · key set' : row.tag ? ' · ' + row.tag : '');
    });
    pick.unshift('auto · keep current (' + one + ')');
    var prov = await aid.wait(run, 'q', {say:'Models depend on which provider you use. Pick a provider first (then a model):', gate:'ask', pick:pick});
    var name = String(prov).split(' · ')[0];
    if('auto' === name){ return 'provider: ' + one + '\nmodel: ' + (aid.model(one) || '(service own)') }
    if(!aid.tab[name]){ return 'unknown provider: ' + name }
    if(aid.tab[name].auth && !aid.key(name)){
      var key = await aid.wait(run, 'p', {say:'Paste the ' + aid.tab[name].name + ' key (vanishes when this tab closes):', kind:'key', pick:[], secret:1});
      aid.key(name, String(key));
    }
    lS.aipro = name;
    var row = aid.tab[name], models = (row.models || []).filter(function(m, i, all){ return all.indexOf(m) === i });
    models.push('(service own default)');
    var gotm = await aid.wait(run, 'm', {say:'Pick a ' + row.name + ' model (or type any model id):', gate:'ask', pick:models});
    var model = String(gotm || '');
    if('(service own default)' === model || !model){ delete lS.aimodel } else { lS.aimodel = model }
    return 'provider: ' + name + '\nmodel: ' + (aid.model(name) || '(service own)')
      + '\nkey: ' + aid.mask(aid.key(name));
  }catch(e){ return 'aid: ' + (e.message || e) }
  finally{ delete aid.live[run.job || run.id] }
};

aid.cfg = async function(raw){
  var all = raw.trim().split(/\s+/), cmd = (all.shift() || '').toLowerCase().replace(/^\//, ''), name, key, keep;
  if('status' === cmd || 'key' === cmd && !all.length){
    name = aid.now();
    return 'provider: ' + name + ' (' + aid.row(name).name + ')\nmodel: ' + (aid.model(name) || '(service own)')
      + '\nkey: ' + aid.mask(aid.key(name)) + '\nfallback: ' + (aid.fall() ? aid.free.join(', ') : 'off')
      + '\nrole: ' + (aid.role ? aid.role.pick() : 'auto')
      + '\nsession keys vanish when this tab closes\nproviders: ' + Object.keys(aid.tab).join(' ');
  }
  if('free' === cmd || 'key' === cmd && 'free' === all[0]){
    delete lS.aipro; delete lS.aikey; delete lS.aimodel; delete lS.aipi;
    return 'free provider: chat\n\n' + (aid.catalog ? await aid.catalog.show() : 'FreeLLM catalog unavailable.');
  }
  if('catalog' === cmd || 'providers' === cmd){ return aid.catalog ? await aid.catalog.show() : 'FreeLLM catalog unavailable.' }
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

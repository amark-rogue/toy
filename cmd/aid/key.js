// key — provider table, paste auto detect, saved picks
// every name maps to one wire shape in net; free rows need no key

;(function(){
var lS = localStorage;
aid.tab = {
  chat: {url: 'https://ch.at/v1/chat/completions', make: 'post', open: 1},
  ollama: {url: 'http://localhost:11434/v1/chat/completions', make: 'post', open: 1, model: 'llama3'},
  router: {url: 'https://openrouter.ai/api/v1/chat/completions', make: 'post', model: 'openrouter/auto'},
  groq: {url: 'https://api.groq.com/openai/v1/chat/completions', make: 'post', model: 'llama-3.3-70b-versatile'},
  openai: {url: 'https://api.openai.com/v1/chat/completions', make: 'post', model: 'gpt-4o-mini'},
  anthropic: {url: 'https://api.anthropic.com/v1/messages', make: 'anth', model: 'claude-haiku-4-5'}
};
// keyless chain: first when no key fits, then again after any failure
aid.free = ['chat', 'ollama'];
// sk-or- router · sk-ant- anthropic · gsk_ groq · sk- openai · else ''
aid.pick = function(key){
  key = key || lS.aikey || '';
  if(/^sk-or-/.test(key)){ return 'router' }
  if(/^sk-ant-/.test(key)){ return 'anthropic' }
  if(/^gsk_/.test(key)){ return 'groq' }
  if(/^sk-/.test(key)){ return 'openai' }
  return '';
};
// provider a call starts from
aid.now = function(){ return lS.aipro || aid.pick() || aid.free[0] };
// chosen first, then the rest of the free chain
aid.chain = function(){
  var use = aid.now(), out = [use], i;
  for(i = 0; i < aid.free.length; i++){
    if(use !== aid.free[i]){ out.push(aid.free[i]) }
  }
  return out;
};
// lS.aipi overrides any url (proxy or self host), lS.aimodel any model
aid.url = function(){ return lS.aipi || (aid.tab[aid.hit] || aid.tab.chat).url };
aid.model = function(){ return lS.aimodel || ((aid.tab[aid.hit] || {}).model || '') };
// aid key [paste | provider | free]
aid.key = async function(word){
  word = (word || '').trim();
  if(!word){
    var key = lS.aikey || '';
    return 'provider: ' + aid.now() + '\nmodel: ' + (aid.model() || '(service own)')
      + '\nkey: ' + (key ? key.slice(0, 6) + '...' : '(none, free chain)')
      + '\nfree: ' + aid.free.join(', ') + '\nnames: ' + Object.keys(aid.tab).join(' ')
      + '\npaste: aid key sk-or-v1...';
  }
  if('free' === word){ delete lS.aipro; delete lS.aikey; return 'free chain on' }
  if(aid.tab[word]){
    lS.aipro = word;
    return 'provider: ' + word + '\nmodel: ' + (aid.model() || '(service own)');
  }
  lS.aikey = word;
  delete lS.aipro;
  var got = aid.pick();
  return got ? ('key saved: ' + got) : ('key saved: odd shape, ' + aid.free[0] + ' stays first');
};
}());

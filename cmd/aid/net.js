// net — one talk call over two wire shapes, falling down the chain
// post speaks the openai like body: ch.at ollama router groq openai proxies
// anth speaks anthropic messages · a failed try moves down the chain

;(function(){
var lS = localStorage;
function head(row, key){
  var out = {'Content-Type': 'application/json'};
  if(lS.aipi || !row.open){ out.Authorization = 'Bearer ' + key }
  if(0 <= aid.url().indexOf('openrouter')){ out['X-Title'] = 'Code on Phone' } // openrouter ranks by it, others cors reject it
  return out;
}
function post(url, headers, body){
  return fetch(url, {method: 'POST', headers: headers, body: JSON.stringify(body)});
}
// openai like: whole talk in, one text out
function open(row, msgs, key){
  var body = {messages: msgs, max_tokens: 4096};
  if(aid.model()){ body.model = aid.model() }
  return post(aid.url(), head(row, key), body);
}
// anthropic: system moves out of the talk
function anth(row, msgs, key){
  var sys = '', talk = [], i, h;
  for(i = 0; i < msgs.length; i++){
    if('system' === msgs[i].role){ sys += (sys ? '\n' : '') + msgs[i].content }
    else{ talk.push(msgs[i]) }
  }
  h = head(row, key);
  h['x-api-key'] = key;
  h['anthropic-version'] = '2023-06-01';
  h['anthropic-dangerous-direct-browser-access'] = 'true';
  return post(aid.url(), h, {model: aid.model(), max_tokens: 4096, system: sys, messages: talk});
}
// pull plain text out of either reply shape
aid.text = async function(res){
  var data = await res.json();
  if(data.error){ throw Error(data.error.message || 'api error') }
  if(data.choices && data.choices[0]){ return data.choices[0].message.content || '' }
  if(data.content){ return data.content.map(function(c){ return c.text || '' }).join('') }
  throw Error('odd reply');
};
// send the whole talk, try each provider until one answers
aid.call = async function(msgs){
  var chain = aid.chain(), bad = '', i, row, res;
  if(aid.hit && 0 > chain.indexOf(aid.hit)){ chain.unshift(aid.hit) }
  for(i = 0; i < chain.length; i++){
    aid.hit = chain[i];
    row = aid.tab[aid.hit] || {};
    try{
      res = await ('anth' === row.make ? anth : open)(row, msgs, lS.aikey || '');
      if(!res.ok){ throw Error(res.status + ' ' + res.statusText) }
      return await aid.text(res);
    }catch(e){ bad = e.message || e }
  }
  throw Error('all providers failed: ' + bad);
};
// quick one shot ask, no tools
aid.ask = async function(q){ return aid.call([{role: 'user', content: q}]) };
}());

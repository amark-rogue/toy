shell.ear('keydown',function(eve, $){ $ = shell.$;
  if(!eve.target.matches('prompt')){ return }
  if(shell.mode){ return } // REPL text goes to the agent — no shell suggestions mid-session
  if(shell.AI.wait){ clearTimeout(shell.AI.wait) }
  shell.AI.wait = setTimeout(async function(){try{
    var ask = $.textContent;
    var answer = await shell.AI.ask("1 sentence reply for terminal shell or code help:" + ask);
    if(shell.note){ return } // connection status owns the help line
    var a = shell.AI.doc(answer), help = $.up().all('help')[0];
    help.textContent = a.textContent + " Tap to execute suggestion.";
    help.cmd = (a.all('code')[0]||a.all('b')[0]||'').textContent||'';
  }catch(e){}},99+(Math.random()*250));
});

shell.ear('click', function(eve, help){
  if(!(help = eve.target.up('help')[0])){ return }
  if(!help.cmd){ return }
  kit.say(help.cmd, 'prompt.try'); // suggestions run in the live prompt — never rewrite a finished bubble
  kit.say('', 'prompt');
});

shell.AI = {
  async txt(url, res){
    if(shell.AI.halt){ shell.AI.halt.abort() } // latest-wins — a slow old reply must not overwrite a fresh one
    res = await fetch(url, {signal: (shell.AI.halt = new AbortController()).signal});
    if(!res.ok){ throw res.status } // error pages are not suggestions
    return await res.text();
  },
  async ask(q){
    return this.txt("https://ch.at/"+encodeURIComponent(q));
  },
  async spell(w){
    return this.ask('TEXT ONLY NO HTML spell correct & add next predicted word to this sentence: '+w);
  },
  doc(a){
    a = new DOMParser().parseFromString(a, 'text/html');
    return (a=a.body||a).all('.a')[0]||a;
  },
  async code(q, code, path, res, data, one, msg){ console.log("ask OR", q, code, path);
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST", headers: { "Authorization": "Bearer "+await shell.AI.key(), "Content-Type": "application/json",
        //'HTTP-Referer': window.location.href, // be ranked?
        'X-Title': 'Code on Phone'
      }, body: JSON.stringify({
        model: "openrouter/free",
        messages: [{role:'system',content:"IMPORTANT: REPLY WITH ONLY CODE, NO EXPLAIN!!! You are a super genius John Carmack but of "+(path||"performance coding")+", it has 10M+ monthly users on decade+ old low end netbooks, so help me with blazing fast, low dependency, simple clean code for: ```"+code},{ role: "user", content: q }],
        max_tokens: 100_000,
        temperature: 0.7,
        stream: false
      }),
    });
    data = await res.json();
    one = (((data || {}).choices || [])[0] || {});
    msg = (one.message || {}).content;
    return msg || JSON.stringify(data);
  },
  async key(){
    return shell.AI.ork || (shell.AI.ork = localStorage.ork || (localStorage.ork = (window.UI && UI.prompt)? await UI.prompt(`openrouter key?`) : ''));
  }
}
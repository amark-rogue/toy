// Bounded model → tool → result loop.

;(function(){
aid.tok = function(run, use){
  use = use || {}; var take = Number(use.prompt_tokens || use.input_tokens || 0), give = Number(use.completion_tokens || use.output_tokens || 0);
  run.use.in += take; run.use.out += give; run.use.all += Number(use.total_tokens || take + give);
};
aid.stream = function(run, id){
  var last = '', tick = 0;
  var send = function(){ tick = 0; aid.emit(run, 'think', {id:id, say:last, live:1}) };
  var on = function(text, out){ last = out.text || last + text; if(!tick){ tick = setTimeout(send, 45) } };
  on.end = function(text, show){
    if(tick){ clearTimeout(tick); tick = 0 } if(!show){ last = ''; return }
    last = text || last; if(last){ send() }
  };
  return on;
};
aid.loop = async function(run){
  var n, got, calls, tool, i, view, id, cut, miss, bad, raw;
  for(n = 0; n < 40; n++){
    if(run.ctl.signal.aborted){ throw Error('stopped') }
    cut = aid.ctx.trim(run); if(cut){ aid.emit(run, 'stat', {say:'Compacted ' + cut + ' earlier context blocks'}) }
    id = run.id + 'a' + (++run.turn); view = aid.stream(run, id); aid.note = '';
    got = await aid.call(run.msgs, view, run);
    if('string' === typeof got){ got = {text:got, calls:[]} } got = got || {text:'', calls:[]};
    aid.tok(run, got.use);
    calls = (got.calls || []).map(aid.tool.one); if(!calls.length){ calls = aid.tool.take(got.text) }
    bad = calls.filter(function(one){ return one.bad });
    miss = !calls.length && aid.tool.miss(got.text);
    if(miss || bad.length){
      view.end('', 0); run.bad = (run.bad || 0) + 1;
      run.msgs.push({role:'assistant', content:got.text || ''});
      raw = got.text || JSON.stringify(got.calls || []);
      run.msgs.push({role:'user', content:aid.tool.fix(raw, bad)});
      aid.emit(run, 'stat', {say:'Invalid tool call · requesting a corrected call (' + run.bad + '/3)'});
      if(3 <= run.bad){ throw Error('model returned invalid tool JSON 3 times') }
      continue;
    }
    run.bad = 0;
    view.end(got.text, !calls.length || !!((got.calls || []).length && got.text));
    for(i = 0; i < calls.length; i++){ if(!calls[i].id){ calls[i].id = run.id + 'c' + (++run.call) } }
    run.pro = aid.hit || run.pro; run.model = aid.model(run.pro);
    if(!calls.length){
      run.msgs.push({role:'assistant', content:got.text || '(empty response)'});
      aid.emit(run, 'say', {id:id, say:got.text || '(empty response)', done:1}); return got.text || '(empty response)';
    }
    if(aid.note){ aid.say(aid.note, run, 'think') }
    run.msgs.push({role:'assistant', content:(got.calls || []).length ? got.text || '' : aid.note || '', calls:calls});
    for(i = 0; i < calls.length; i++){
      tool = await aid.tool.run(run, calls[i]);
      run.msgs.push({role:'tool', id:tool.id, name:tool.name, content:tool.content});
      run.step += 1; await aid.store.save(run);
    }
  }
  throw Error('stopped after 40 tool steps');
};
}());

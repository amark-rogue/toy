// Provider request, retry and fallback boundary.

;(function(){
aid.net = aid.net || {};
aid.net.plain = aid.net.plain || {};
aid.net.head = function(name){
  var row = aid.row(name), key = aid.key(name), out = {'Content-Type':'application/json'}, head = row.head || {}, one;
  if(('bear' === row.auth || 'may' === row.auth) && key){ out.Authorization = 'Bearer ' + key }
  if('xkey' === row.auth && key){
    out['x-api-key'] = key; out['anthropic-version'] = '2023-06-01';
    out['anthropic-dangerous-direct-browser-access'] = 'true';
  }
  for(one in head){ out[one] = head[one] }
  return out;
};
aid.net.body = function(name, msg, live, plain){
  var row = aid.row(name), api = aid.net.api[row.make] || aid.net.api.open;
  return api.body(name, msg, live, plain);
};
aid.net.bad = async function(res){
  var body = ''; try{ body = await res.text() }catch(e){}
  try{ var obj = JSON.parse(body); body = (obj.error || {}).message || obj.message || body }catch(e){}
  var err = Error((res.status || 'network') + ' ' + (body || res.statusText || 'request failed'));
  err.status = res.status || 0; throw err;
};
aid.net.once = async function(name, msg, on, run, plain){
  var row = aid.row(name), url = aid.url(name), key = aid.key(name), ctl = new AbortController(), tick, res, out;
  if(!url){ throw Error(name + ': URL missing') }
  if(('bear' === row.auth || 'xkey' === row.auth) && !key){ var no = Error(name + ': key missing'); no.status = 401; throw no }
  if(false === row.cors){
    var cors = Error(row.block || row.name + ' blocks direct static-page requests'); cors.status = 400; throw cors;
  }
  if(run && run.ctl){ run.ctl.signal.addEventListener('abort', function(){ ctl.abort() }, {once:true}) }
  tick = setTimeout(function(){ ctl.abort() }, 90000);
  try{
    res = await fetch(url, {method:'POST', headers:aid.net.head(name), signal:ctl.signal, body:JSON.stringify(aid.net.body(name, msg, !!on, plain))});
    if(!res.ok){ return aid.net.bad(res) }
    if(!on){ out = await res.json(); return aid.net.turn(out, row.make) }
    out = {text:'', calls:[], use:{}};
    await aid.sse(res, function(obj, type){
      aid.net.live(out, obj, type, on, row.make);
    });
    return aid.net.done(out);
  }finally{ clearTimeout(tick) }
};
aid.net.again = function(err){
  return !err.status || 408 === err.status || 409 === err.status || 425 === err.status || 429 === err.status || 500 <= err.status;
};
aid.call = async function(msg, on, run){
  var all = aid.chain(), last, name, row, mode, key, n, i;
  for(i = 0; i < all.length; i++){
    name = all[i]; row = aid.row(name); aid.hit = name; key = name + ':' + aid.url(name) + ':' + aid.model(name); mode = !!aid.net.plain[key];
    if(aid.emit){ aid.emit(run, 'stat', {say:'Using ' + row.name + (aid.model(name) ? ' · ' + aid.model(name) : '')}) }
    for(n = 0; n < 2; n++){
      try{ return await aid.net.once(name, msg, row.tool && !mode ? on : null, run, mode) }
      catch(e){
        last = e;
        if(e.name === 'AbortError' || run && run.ctl && run.ctl.signal.aborted){ throw Error('stopped') }
        if(!mode && row.tool && 'open' === row.make && /^(?:400|404|405|415|422|501)$/.test('' + e.status)){
          try{
            if(aid.emit){ aid.emit(run, 'stat', {say:row.name + ' model declined native tools · using canonical JSON'}) }
            var got = await aid.net.once(name, msg, null, run, 1); aid.net.plain[key] = 1; return got;
          }catch(fall){ last = fall }
        }
        if(!aid.net.again(last) || n){ break }
        await new Promise(function(ok){ setTimeout(ok, 400 + n * 800) });
      }
    }
    if(aid.emit){ aid.emit(run, 'stat', {say:row.name + ' failed: ' + (last.message || last)}) }
  }
  throw last || Error('No provider available');
};
}());

// Chunk-safe Server Sent Event reader.

;(function(){
aid.sse = async function(res, each){
  if(!res.body || !res.body.getReader){ each(await res.json(), ''); return }
  var get = res.body.getReader(), dec = new TextDecoder(), buf = '', got, hit;
  var send = function(one){
    var row = one.split(/\r?\n/), type = '', data = [], i, val, sse = 0;
    for(i = 0; i < row.length; i++){
      if(0 === row[i].indexOf('event:')){ type = row[i].slice(6).trim(); sse = 1 }
      if(0 === row[i].indexOf('data:')){ data.push(row[i].slice(5).trim()); sse = 1 }
    }
    data = (sse ? data.join('\n') : one).trim();
    if(!data || '[DONE]' === data){ return }
    try{ val = JSON.parse(data) }catch(e){ return }
    each(val, type);
  };
  while(!(got = await get.read()).done){
    buf += dec.decode(got.value, {stream:true});
    while(buf){
      if(/^(?:event:|data:|:)/.test(buf)){
        hit = buf.match(/\r?\n\r?\n/); if(!hit){ break }
        send(buf.slice(0, hit.index)); buf = buf.slice(hit.index + hit[0].length); continue;
      }
      hit = buf.match(/\r?\n/); if(!hit){ break }
      send(buf.slice(0, hit.index)); buf = buf.slice(hit.index + hit[0].length);
    }
  }
  buf += dec.decode(); if(buf.trim()){ send(buf) }
};
}());

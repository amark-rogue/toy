// `aid free`/`aid catalog` read this public directory as data, never as code.
// Loading this optional AID part does not fetch or index anything.

;(function(C){
C.url = 'https://raw.githubusercontent.com/0xkaize/freeLLM/main/src/data/models.ts';
C.key = 'aid.catalog.freellm';
C.age = 6 * 60 * 60 * 1000;

C.text = function(raw, key, hit){
  hit = new RegExp('\\b' + key + '\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"').exec(raw || '');
  if(!hit){ return '' }
  try{ return JSON.parse('"' + hit[1] + '"') }catch(e){ return '' }
};
C.list = function(raw, key, hit, out, re){
  hit = new RegExp('\\b' + key + '\\s*:\\s*\\[([^\\]]*)\\]').exec(raw || ''); out = [];
  if(!hit){ return out }
  re = /"((?:\\.|[^"\\])*)"/g;
  while((raw = re.exec(hit[1]))){ try{ out.push(JSON.parse('"' + raw[1] + '"')) }catch(e){} }
  return out;
};
C.blocks = function(raw, all, at, deep, quote, slash, line, one, c){
  raw = '' + (raw || ''); all = []; at = raw.indexOf('models: Model[]');
  if(0 > at){ at = raw.indexOf('models =') }

  at = raw.indexOf('[', 0 > at ? 0 : at); if(0 > at){ return all }
  at += 1;
  deep = 0;
  for(; at < raw.length; at += 1){
    c = raw.charAt(at);
    if(quote){
      if(slash){ slash = 0 } else if('\\' === c){ slash = 1 } else if(c === quote){ quote = '' }
      continue;
    }
    if(line){ if('\n' === c){ line = 0 } continue }
    if('/' === c && '/' === raw.charAt(at + 1)){ line = 1; at += 1; continue }
    if('/' === c && '*' === raw.charAt(at + 1)){ one = raw.indexOf('*/', at + 2); at = 0 > one ? raw.length : one + 1; continue }
    if('"' === c || "'" === c || '`' === c){ quote = c; continue }
    if('{' === c){ if(!deep){ one = at } deep += 1; continue }
    if('}' === c && deep && !--deep){ all.push(raw.slice(one, at + 1)); continue }
    if(']' === c && !deep){ break }
  }
  return all;
};
C.rows = function(raw, all, out, one, row, url){
  all = C.blocks(raw); out = [];
  for(var i = 0; i < all.length; i += 1){
    one = all[i]; row = {id:C.text(one, 'id'), provider:C.text(one, 'provider'), type:C.list(one, 'type'), access:C.list(one, 'access'), status:C.text(one, 'status'), limit:C.text(one, 'freeLimit'), url:C.text(one, 'url')};
    try{ url = new URL(row.url) }catch(e){ continue }
    if(!row.id || !row.provider || 'https:' !== url.protocol || url.username || url.password){ continue }
    out.push(row);
  }
  return out;
};
C.get = async function(now, hit, res, rows){
  now = Date.now();
  try{ hit = JSON.parse(sessionStorage.getItem(C.key) || 'null') }catch(e){}
  if(hit && hit.at + C.age > now && Array.isArray(hit.rows)){ return hit.rows }
  try{
    res = await fetch(C.url, {cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer'});
    if(!res.ok){ throw Error(res.status || 'request failed') }
    rows = C.rows(await res.text()); if(!rows.length){ throw Error('no catalog rows') }
    try{ sessionStorage.setItem(C.key, JSON.stringify({at:now, rows:rows})) }catch(e){}
    return rows;
  }catch(e){ return hit && hit.rows || [] }
};
C.use = {'gemini-2.5-flash':'gemini', openrouter:'router', 'opencode-zen':'zen'};
C.show = async function(rows, out, row, use, i){
  rows = await C.get(); out = ['FreeLLM catalog · ' + rows.length + ' current free-access listings'];
  for(i = 0; i < rows.length; i += 1){
    row = rows[i]; if(!row.type.includes('text') && !row.type.includes('code')){ continue }
    use = C.use[row.id];
    out.push(row.provider + ' · ' + (row.limit || 'free access') + (use ? ' · aid /use ' + use : '') + '\n' + row.url);
  }
  out.push('Directory data is informational: a listing is not an anonymous API or a configured AID adapter.');
  return out.join('\n\n');
};
}(aid.catalog = aid.catalog || {}));

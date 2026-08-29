// CORS-limited page retrieval; fetched markup is scanned as text and never parsed or mounted.

;(function(){
aid.web = {};
aid.web.pick = function(text, word){
  if(!word){ return text } word = word.toLowerCase();
  return text.split(/\r?\n/).filter(function(row){ return 0 <= row.toLowerCase().indexOf(word) }).slice(0, 120).join('\n') || 'no hit for ' + word;
};
aid.web.ent = function(text, map){
  map = {amp:'&',apos:"'",colon:':',gt:'>',lt:'<',nbsp:' ',quot:'"',sol:'/'};
  return ('' + (text || '')).replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);?/gi, function(raw, name, n){
    if('#' !== name.charAt(0)){ return map[name.toLowerCase()] || raw }
    n = parseInt(name.charAt(1).toLowerCase() === 'x' ? name.slice(2) : name.slice(1), name.charAt(1).toLowerCase() === 'x' ? 16 : 10);
    if(!n || n > 0x10ffff || n >= 0xd800 && n <= 0xdfff){ return '\ufffd' }
    if(n <= 0xffff){ return String.fromCharCode(n) } n -= 0x10000;
    return String.fromCharCode(0xd800 + (n >> 10), 0xdc00 + (n & 1023));
  });
};
aid.web.tag = function(text, at, i, from, q, c, name, close){
  if('<!--' === text.slice(at, at + 4)){ i = text.indexOf('-->', at + 4); return {end:0 > i ? text.length : i + 3} }
  i = at + 1; while(/\s/.test(text.charAt(i))){ i += 1 }
  close = '/' === text.charAt(i); if(close){ i += 1; while(/\s/.test(text.charAt(i))){ i += 1 } }
  from = i; while(/[a-z0-9:-]/i.test(text.charAt(i))){ i += 1 }
  name = text.slice(from, i).toLowerCase(); if(!name){ return {end:at + 1, text:'<'} }
  from = i;
  for(; i < text.length; i += 1){
    c = text.charAt(i); if(q){ if(c === q){ q = '' } continue }
    if('"' === c || "'" === c){ q = c; continue } if('>' === c){ break }
  }
  return {name:name, close:close, attr:text.slice(from, i), end:i < text.length ? i + 1 : text.length};
};
aid.web.attr = function(raw, want, i, from, name, q, val){
  raw = '' + (raw || ''); want = want.toLowerCase(); i = 0;
  while(i < raw.length){
    while(/\s|\//.test(raw.charAt(i))){ i += 1 } from = i;
    while(i < raw.length && !/[\s=]/.test(raw.charAt(i))){ i += 1 }
    name = raw.slice(from, i).toLowerCase(); while(/\s/.test(raw.charAt(i))){ i += 1 }
    val = ''; if('=' === raw.charAt(i)){
      i += 1; while(/\s/.test(raw.charAt(i))){ i += 1 } q = raw.charAt(i);
      if('"' === q || "'" === q){ from = ++i; while(i < raw.length && q !== raw.charAt(i)){ i += 1 } val = raw.slice(from, i); i += 1 }
      else { from = i; while(i < raw.length && !/\s/.test(raw.charAt(i))){ i += 1 } val = raw.slice(from, i) }
    }
    if(name === want){ return aid.web.ent(val) } if(i === from){ i += 1 }
  }
  return '';
};
aid.web.clean = function(text){
  return aid.web.ent(text).replace(/\r/g, '').replace(/[ \t\f\v]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
};
aid.web.url = function(raw, base, url){
  try{ url = new URL(aid.web.ent(raw), base) }catch(e){ return '' }
  if(!/^https?:$/.test(url.protocol) || url.username || url.password){ return '' } return url.href;
};
aid.web.html = function(text, base){
  text = '' + (text || ''); var low = text.toLowerCase(), out = [], title = [], links = [], seen = {}, at = 0, next, one, end, link, url, word;
  var drop = {script:1,style:1,noscript:1,template:1,iframe:1,object:1,svg:1,math:1};
  var block = /^(?:address|article|aside|blockquote|br|div|dl|dt|dd|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tr|ul)$/;
  var add = function(raw){ if(!raw){ return } if(one && 'title' === one.name){ title.push(raw) } else { out.push(raw); if(link){ link.text.push(raw) } } };
  while(at < text.length){
    next = text.indexOf('<', at); if(0 > next){ add(text.slice(at)); break } add(text.slice(at, next));
    one = aid.web.tag(text, next); if(one.text){ add(one.text) } at = one.end; if(!one.name){ continue }
    if(!one.close && drop[one.name]){
      end = low.indexOf('</' + one.name, at); if(0 > end){ break } one = aid.web.tag(text, end); at = one.end; continue;
    }
    if('title' === one.name){ if(one.close){ one = null } continue }
    if(!one.close && 'a' === one.name){ link = {href:aid.web.attr(one.attr, 'href'), text:[]}; continue }
    if(one.close && 'a' === one.name && link){
      url = aid.web.url(link.href, base); word = aid.web.clean(link.text.join('')) || 'link';
      if(url && !seen[url] && links.length < 40){ seen[url] = 1; links.push(word + ' · ' + url) } link = null; continue;
    }
    if(block.test(one.name)){ add('\n') }
  }
  if(link){ url = aid.web.url(link.href, base); if(url && !seen[url] && links.length < 40){ links.push((aid.web.clean(link.text.join('')) || 'link') + ' · ' + url) } }
  title = aid.web.clean(title.join('')); out = aid.web.clean(out.join(''));
  return (title ? title + '\n' : '') + out + (links.length ? '\n\nLinks:\n' + links.join('\n') : '');
};
aid.use = aid.use || {};
aid.use.web = async function(arg, run){
  var raw = ('' + (arg.url || '')).trim(), url, ctl = new AbortController(), tick, res, type = '', text;
  try{ url = new URL(raw) }catch(e){ return 'web needs a full http or https URL' }
  if(!/^https?:$/.test(url.protocol)){ return 'web only permits http or https URLs' }
  if(url.username || url.password){ return 'web does not permit credentials in URLs' }
  if(run && run.ctl){ run.ctl.signal.addEventListener('abort', function(){ ctl.abort() }, {once:true}) }
  tick = setTimeout(function(){ ctl.abort() }, Math.max(3, Math.min(Number(arg.secs) || 20, 60)) * 1000);
  try{
    res = await fetch(url.href, {signal:ctl.signal, credentials:'omit', referrerPolicy:'no-referrer'});
    if(!res.ok){ return 'web ' + res.status + ' ' + (res.statusText || 'request failed') + ' · ' + url.href }
    type = res.headers && res.headers.get ? res.headers.get('content-type') || '' : '';
    text = aid.cap(await res.text(), 500000);
    if(/html/i.test(type) || /^\s*<!?html/i.test(text)){ text = aid.web.html(text, res.url || url.href) }
    else if(/json/i.test(type)){ try{ text = JSON.stringify(JSON.parse(text), null, 2) }catch(e){} }
    return aid.cap((res.url || url.href) + '\n' + aid.web.pick(text, '' + (arg.word || '')), 30000);
  }catch(e){
    if(run && run.ctl && run.ctl.signal.aborted){ throw Error('stopped') }
    return 'web error: ' + (e.name === 'AbortError' ? 'request timed out' : e.message || e) + '\nThe site may block static-page CORS.';
  }finally{ clearTimeout(tick) }
};
}());

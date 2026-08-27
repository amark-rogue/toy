// CORS-limited page retrieval; fetched markup is parsed inertly and never mounted.

;(function(){
aid.web = {};
aid.web.pick = function(text, word){
  if(!word){ return text } word = word.toLowerCase();
  return text.split(/\r?\n/).filter(function(row){ return 0 <= row.toLowerCase().indexOf(word) }).slice(0, 120).join('\n') || 'no hit for ' + word;
};
aid.web.html = function(text, base){
  if(!window.DOMParser){ return text }
  var doc = new DOMParser().parseFromString(text, 'text/html'), out = [], seen = {}, all, i, one, href;
  all = doc.documentElement.all('script,style,noscript,template');
  for(i = 0; i < all.length; i++){ if(all[i].parentNode){ all[i].parentNode.removeChild(all[i]) } }
  text = (doc.body && doc.body.textContent || doc.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  all = doc.documentElement.all('a[href]');
  for(i = 0; i < all.length && out.length < 40; i++){
    one = all[i]; try{ href = new URL(one.getAttribute('href'), base).href }catch(e){ continue }
    if(!/^https?:/i.test(href)){ continue }
    if(seen[href]){ continue } seen[href] = 1; out.push(((one.textContent || '').trim() || 'link') + ' · ' + href);
  }
  return (doc.title ? doc.title.trim() + '\n' : '') + text + (out.length ? '\n\nLinks:\n' + out.join('\n') : '');
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

// Safe small Markdown. Rules inspect frozen text and return {at,name,text,url,head}.

;(function(){
var MD = AID.md = {ext:{line:[],span:[]}};
MD.use = function(kind, fn){ var all = MD.ext[kind]; if(all && 'function' === typeof fn){ all.unshift(fn) } return MD };
MD.node = function(name, mark){
  if(!/^[a-z][a-z0-9]*$/.test(name || '')){ return null }
  mark = AID.mod.all('.mark > .' + name)[0]; return mark ? mark.cloneNode(true) : null;
};
MD.text = function(box, text){ if(text){ box.appendChild(document.createTextNode(text)) } };
MD.safe = function(url, hit){
  url = (url || '').trim(); if(!url || /[\u0000-\u001f\u007f]/.test(url)){ return '' }
  try{ hit = new URL(url, document.baseURI || location.href) }catch(e){ return '' }
  if(!/^(?:https?|mailto|tel):$/.test(hit.protocol)){ return '' }
  if(/^https?:$/.test(hit.protocol) && (hit.username || hit.password)){ return '' }
  return hit.href;
};
MD.close = function(text, at){
  var deep = 0, i, c;
  for(i = at; i < text.length; i++){ c = text.charAt(i); if('(' === c){ deep += 1 } else if(')' === c){ if(!deep){ return i } deep -= 1 } }
  return -1;
};
MD.tags = /^(?:A|BLOCKQUOTE|CODE|DETAILS|DIV|EM|H[1-6]|HR|LI|OL|P|PRE|S|SPAN|STRONG|UL)$/;
MD.put = function(ctx, row, at, max, name, node, text, url, sum, body, all, i){
  if(!row || '[object Object]' !== Object.prototype.toString.call(row)){ return 0 }
  at = Math.floor(Number(row.at)); max = ctx.all ? ctx.all.length : ctx.text.length;
  if(!(at > ctx.at && at <= max)){ return 0 }
  name = ('' + (row.name || '')).toLowerCase(); node = MD.node(name);
  if(!node || !MD.tags.test(node.tagName)){ return 0 }
  all = node.attributes; for(i = all.length - 1; 0 <= i; i--){ if('class' !== all[i].name){ node.removeAttribute(all[i].name) } }
  text = null == row.text ? '' : '' + row.text;
  if('fold' === name){
    sum = node.all('summary')[0]; body = node.all('.md')[0];
    if(!sum || !body){ return 0 } sum.textContent = null == row.head ? 'Details' : '' + row.head; body.textContent = text;
  } else {
    while(node.firstChild){ node.removeChild(node.firstChild) } node.textContent = text;
  }
  if('link' === name){
    url = MD.safe(row.url); if(!url){ return 0 }
    node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; node.referrerPolicy = 'no-referrer';
  }
  ctx.box.appendChild(node); return at;
};
MD.try = function(kind, ctx){
  var all = MD.ext[kind], view = {kind:kind, at:ctx.at, text:ctx.all ? ctx.all[ctx.at] : ctx.text}, i, row, at;
  if(ctx.all){ view.all = ctx.all }
  try{ Object.freeze(view) }catch(e){}
  for(i = 0; i < all.length; i++){
    try{ row = all[i](view) }catch(e){ row = null }
    at = MD.put(ctx, row); if(at){ return at }
  }
  return 0;
};
}());

;(function(MD){
MD.rich = function(box, text){
  var ctx = {box:box, text:'' + (text || ''), at:0, md:MD}, at = 0, buf = '', next, end, mark, node, url;
  var flush = function(){ MD.text(box, buf); buf = '' };
  while(at < ctx.text.length){
    ctx.at = at; next = MD.try('span', ctx); if(next){ flush(); at = next; continue }
    mark = ctx.text.substr(at, 2);
    if('\\' === ctx.text.charAt(at) && at + 1 < ctx.text.length){ buf += ctx.text.charAt(at + 1); at += 2; continue }
    if('`' === ctx.text.charAt(at) && (end = ctx.text.indexOf('`', at + 1)) > at){
      flush(); node = MD.node('span'); node.textContent = ctx.text.slice(at + 1, end); box.appendChild(node); at = end + 1; continue;
    }
    if('[' === ctx.text.charAt(at) && (end = ctx.text.indexOf('](', at + 1)) > at){
      next = MD.close(ctx.text, end + 2); url = 0 > next ? '' : MD.safe(ctx.text.slice(end + 2, next));
      if(next > end){ flush(); node = url ? MD.node('link') : document.createDocumentFragment(); if(url){ node.href = url } // SECURITY: note CSP disallows inline-scripts etc.
        MD.rich(node, ctx.text.slice(at + 1, end)); box.appendChild(node); at = next + 1; continue }
    }
    if(('**' === mark || '__' === mark || '~~' === mark) && (end = ctx.text.indexOf(mark, at + 2)) > at){
      flush(); node = MD.node('~~' === mark ? 'del' : 'bold'); MD.rich(node, ctx.text.slice(at + 2, end)); box.appendChild(node); at = end + 2; continue;
    }
    if(('*' === ctx.text.charAt(at) || '_' === ctx.text.charAt(at)) && (end = ctx.text.indexOf(ctx.text.charAt(at), at + 1)) > at){
      flush(); node = MD.node('ital'); MD.rich(node, ctx.text.slice(at + 1, end)); box.appendChild(node); at = end + 1; continue;
    }
    buf += '\n' === ctx.text.charAt(at) ? ' ' : ctx.text.charAt(at); at += 1;
  }
  flush(); return box;
};
}(AID.md));

;(function(MD){
MD.stop = function(text){ return /^\s*(?:```|#{1,6}\s|>|[-+*]\s|\d+[.)]\s|(?:---+|\*\*\*+)\s*$)/.test(text) };
MD.add = function(box, name, text){ var node = MD.node(name); MD.rich(node, text); box.appendChild(node); return node };
MD.list = function(ctx, name, find){
  var list = MD.node(name), mark = list.all('li')[0], one, hit, at = ctx.at;
  while(list.firstChild){ list.removeChild(list.firstChild) }
  while(at < ctx.all.length && (hit = find.exec(ctx.all[at]))){ one = mark.cloneNode(true); MD.rich(one, hit[1]); list.pin(one); at += 1 }
  ctx.box.appendChild(list); return at;
};
MD.draw = function(box, text){
  text = '' + (text || ''); if(box.aid === text){ return box } box.aid = text;
  var all = text.replace(/\r\n?/g, '\n').split('\n'), out = document.createDocumentFragment(), ctx = {all:all,box:out,at:0,md:MD}; // SECURITY: note CSP disallows inline-scripts etc.
  try{ Object.freeze(all) }catch(e){}
  var line, hit, at, name, code, quote, node, next;
  while(ctx.at < all.length){
    next = MD.try('line', ctx); if(next){ ctx.at = next; continue }
    line = all[ctx.at]; if(!line.trim()){ ctx.at += 1; continue }
    if((hit = /^\s*```([^`]*)$/.exec(line))){
      code = []; at = ctx.at + 1; while(at < all.length && !/^\s*```\s*$/.test(all[at])){ code.push(all[at++]) }
      node = MD.node('code'); node.all('code')[0].textContent = code.join('\n'); out.appendChild(node); ctx.at = at + (at < all.length ? 1 : 0); continue;
    }
    if((hit = /^(#{1,6})\s+(.+)$/.exec(line))){ MD.add(out, 'head' + hit[1].length, hit[2]); ctx.at += 1; continue }
    if(/^\s*(?:---+|\*\*\*+)\s*$/.test(line)){ out.appendChild(MD.node('rule')); ctx.at += 1; continue }
    if(/^\s*>/.test(line)){
      quote = []; at = ctx.at; while(at < all.length && /^\s*>\s?/.test(all[at])){ quote.push(all[at++].replace(/^\s*>\s?/, '')) }
      node = MD.node('quote'); MD.draw(node.all('.md')[0], quote.join('\n')); out.appendChild(node); ctx.at = at; continue;
    }
    if(/^\s*[-+*]\s+/.test(line)){ ctx.at = MD.list(ctx, 'list', /^\s*[-+*]\s+(.+)$/); continue }
    if(/^\s*\d+[.)]\s+/.test(line)){ ctx.at = MD.list(ctx, 'count', /^\s*\d+[.)]\s+(.+)$/); continue }
    at = ctx.at + 1; while(at < all.length && all[at].trim() && !MD.stop(all[at])){ at += 1 }
    MD.add(out, 'para', all.slice(ctx.at, at).join('\n')); ctx.at = at;
  }
  while(box.firstChild){ box.removeChild(box.firstChild) } box.appendChild(out); return box;
};
}(AID.md));

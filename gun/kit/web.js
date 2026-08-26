;(function(){
var W = window, D = document, ON = 'addEventListener', HI = 'createElement', ID = 'getElementById', U, DEV = ('file:'===location.protocol);
if(W.parent !== W){ D.documentElement.classList.add('part') }
var tmp = D[HI]('meta'); tmp.name = 'viewport'; tmp.content = 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content'; D.head.appendChild(tmp);
tmp = D.head.parentNode.style; if(W.parent === W) { tmp['overscroll-behavior-y'] = 'contain'; tmp['background-color'] = 'var(--fill)'; } else { tmp['overflow-y'] = 'auto'; tmp['overscroll-behavior-y'] = 'auto'; }
;(function(){ if(screen.width > screen.height){ return } // phone only debug
  var add = function(){ if(console.view){ return } (console.view = document[HI]('textarea')).style="position:fixed; z-index:99999; inset:0; width:100%; height:4em; padding: 0; background:rgba(100%,100%,100%,0.8); color:black; transition: 0.5s all; white-space: pre-wrap; overflow-wrap: break-word; word-break: break-all;"; console.view.readOnly = 1; setTimeout(function(){D.body.appendChild(console.view);},99); console.view.onclick = function(eve){ console.view.style.height = ('4em'==console.view.style.height)?'50vh':'4em' ; console.view.select(); D.execCommand('copy'); navigator.clipboard.writeText(console.view.value) } }
  console.log = console.warn = console.error = function(...args){ if(console.off){ return } add(); console.view.value += JSON.stringify(args).slice(1,-1); console.view.scrollTop = console.view.scrollHeight; }
  window.onerror = window.onunhandledrejection = console.log;
}());
kit = function(){};
kit.ears = kit.ears || {};
kit.q = kit.q || {};
kit.ios = /iP(ad|hone|od)/.test(navigator.userAgent) || navigator.platform == 'MacIntel' && navigator.maxTouchPoints > 1;
kit.ear = function(h,e,v){
  (v=v||W)[ON](e=(h.call?(h.where=e):(e.where=h,(h=e).where))||'',h);
  v.tagName === 'IFRAME' && v.contentWindow && kit.views.set(v.contentWindow, v);
  kit.ears[e] = 1;
  h.off = function(){ v.removeEventListener(e,h) };  W===v&&kit.up(e,'ear'); 
  if(kit.q[e]){
    var q = kit.q[e]; kit.q[e] = null;
    q.forEach(function(m){ kit.say(m.d, e, v, m.s) });
  }
  return h; 
};
kit.say = function(d,e,v,s){ 
  e=e||''; v=v||W;
  v.tagName === 'IFRAME' && v.contentWindow && kit.views.set(v.contentWindow, v);
  if(v === W && !kit.ears[e]){
    var qi = {d:d, s:s};
    (kit.q[e] = kit.q[e] || []).push(qi);
    setTimeout(function(){
      if(kit.q[e]){
        var x = kit.q[e].indexOf(qi);
        if(x > -1){ kit.q[e].splice(x, 1) }
      }
    }, 9999);
  }
  var ev = new CustomEvent(e,{detail:d,bubbles:true,cancelable:true});
  v.dispatchEvent(ev); 
  (!s && W===v || s === 1 && !ev.defaultPrevented) && kit.up(d,e);
  if(v.tagName === 'IFRAME'){
    if(kit._echo && kit._echo.i === v && kit._echo.t === e){ return }
    var send = function() {
      if(send.off) send.off();
      if(v.contentWindow) v.contentWindow.postMessage({data:d, type:e, wrap:-1}, DEV?'*':location.origin);
    };
    if(v.readyState){ send() } else { kit.ear('ready', send, v) }
  }
};
kit.up = function up(data,type){
  if(W === W.parent){ return }
  if(U === data){ return }
  if('message' == type){ return }
  W.parent.postMessage({detail:data,type:type,wrap:1},DEV?'*':location.origin);
}
W[ON]('message',function(eve,data,i){
  if(W === eve.source){ return }
  if(eve.origin !== (DEV?'null':location.origin)){
    eve.preventDefault();
    eve.stopImmediatePropagation();
    eve.stopPropagation();
    return;
  }
  if(U === (data = eve.data||eve.detail)){ return }
  if(!(i = kit.views.get(eve.source))){
    try { i = eve.source.frameElement; } catch(e) {}
    if(i && i.ownerDocument !== D) i = null;
    if(i){
      kit.views.set(eve.source, i);
      kit.frame.lockScroll(i);
      kit.frame.refresh();
    } else {
      if(eve.source !== W.parent){ return }
      kit.say(data.data||data.detail,data.type,0,data.wrap||-1);
      return;
    }
  }
  if(i.hasAttribute('sandbox')&&!i.sandbox.contains('allow-same-origin'))return
  i.readyState = 1;

  if('ear'==data.type){
    var t=data.detail||data.data, set=i.ears||(i.ears=new Set);
    if(set.has(t))return;set.add(t);
    kit.ear(t,function hear(eve){ if(!(i||'').contentWindow){hear.off(); return } if(eve.defaultPrevented || kit._echo && kit._echo.i === i && kit._echo.t === eve.type){ return } if(((eve.target||'').tagName) === 'IFRAME'){ return } i.contentWindow.postMessage({data:eve.detail||eve.data,type:eve.type,wrap:-1}, DEV?'*':location.origin) }); return
  }
  kit._echo = {i:i,t:data.type}; kit.say(data.data||data.detail,data.type,i,data.wrap||1); kit._echo = null;
});
kit.views = new Map;
(kit.size = function(e,b,h){
  b = ((e||[])[0]||'').borderBoxSize || '';
  h = ((b[0]||b).blockSize);
  if(U === h){ h = D.body ? D.body.getBoundingClientRect().height : 0 }
  return {height: Math.ceil(h)};
});
kit.watch = {};
kit.watch.resize = function(e,s){
  s = kit.size(e);
  if(s.height === kit.watch.last){ return }
  kit.watch.last = s.height;
  kit.up(s,'style');
};
kit.watch.start = function(){
  if(!D.body || kit.watch.body === D.body || W === W.parent){ return }
  kit.watch.body = D.body;
  kit.watch.last = U;
  if(kit.watch.ro){ kit.watch.ro.disconnect() }
  if(W.ResizeObserver){
    kit.watch.ro = new ResizeObserver(kit.watch.resize);
    kit.watch.ro.observe(D.body);
  } else { kit.watch.resize() }
};
kit.watch.join = function(node, all, i){
  if(!node || !node.nodeName){ return }
  node.dispatchEvent(new CustomEvent('join>'+node.nodeName.toLowerCase(), {bubbles:true}));
  node.dispatchEvent(new CustomEvent('join', {bubbles:true}));
  all = node.querySelectorAll && node.querySelectorAll('*');
  if(!all){ return }
  for(i = 0; i < all.length; i += 1){ kit.watch.join(all[i]) }
};
(kit.watch.observer = new MutationObserver(function(eve){eve.forEach(function(changes){changes.addedNodes.forEach(function(node){
  kit.watch.join(node);
})});
  kit.watch.start();
  if(kit.vars && kit.vars.sync){ kit.vars.sync() }
  if(W !== W.parent){ kit.watch.resize() }
})).observe(D.documentElement||D,{childList:true,subtree:true,characterData:true,attributes:true});
kit.watch.start();
kit.vars = {};
kit.vars.fix = function(val, all, seen){
  return String(val || '').replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, function(_, key, alt){
    if((seen = seen || {})[key]){ return alt || '' }
    seen[key] = 1;
    return kit.vars.fix(all[key] || alt || '', all, seen);
  }).trim();
};
kit.vars.take = function(css, out, i, key, val){
  if(!css){ return out }
  for(i = 0; i < css.length; i += 1){
    key = css[i];
    if(key.slice(0, 2) !== '--'){ continue }
    val = css.getPropertyValue(key);
    if(val){ out[key] = val }
  }
  return out;
};
kit.vars.rule = function(el, out, rules, i, rule, css){
  if(!rules){ return out }
  for(i = 0; i < rules.length; i += 1){
    rule = rules[i];
    if(rule.conditionText && W.matchMedia && !W.matchMedia(rule.conditionText).matches){ continue }
    if(rule.cssRules){ kit.vars.rule(el, out, rule.cssRules); continue }
    css = rule.style;
    if(!css || !rule.selectorText){ continue }
    try{ if(!el.matches(rule.selectorText)){ continue } }catch(e){ continue }
    kit.vars.take(css, out);
  }
  return out;
};
kit.vars.get = function(el, out, css, i, key){
  out = {};
  for(i = 0; i < D.styleSheets.length; i += 1){
    try{ kit.vars.rule(el, out, D.styleSheets[i].cssRules) }catch(e){}
  }
  kit.vars.take(el.style, out);
  css = W.getComputedStyle(el);
  kit.vars.take(css, out);
  return out;
};
kit.vars.all = function(out, key){
  out = kit.vars.get(D.documentElement);
  if(D.body){
    var bod = kit.vars.get(D.body);
    for(key in bod){ out[key] = bod[key] }
  }
  for(key in out){ out[key] = kit.vars.fix(out[key], out) }
  return out;
};
kit.vars.pull = function(src, dst, was, key, val, now){
  src = src && src.style; if(!src){ return }
  dst = dst || D.documentElement; if(!dst){ return }
  was = dst._kitVar || (dst._kitVar = {});
  for(var i = 0; i < src.length; i += 1){
    key = src[i];
    if(key.slice(0, 2) !== '--'){ continue }
    val = src.getPropertyValue(key);
    now = dst.style.getPropertyValue(key);
    if(was[key] && now && now !== was[key]){ continue }
    dst.style.setProperty(key, val);
    was[key] = val;
  }
};
kit.vars.put = function(i, d, el, css, all, was, key, val, now){
  try{
    if(!i){ return }
    all = kit.vars.all();
    for(key in all){ i.style.setProperty(key, all[key]) }
    d = i.contentDocument; if(!d){ return }
    el = d.documentElement; if(!el){ return }
    if(i._kitDoc !== d){ i._kitDoc = d; i._kitVar = {} }
    css = i.contentWindow && i.contentWindow.getComputedStyle(el);
    was = i._kitVar || (i._kitVar = {});
    for(key in all){
      val = all[key];
      now = css ? css.getPropertyValue(key) : el.style.getPropertyValue(key);
      if(was[key] && now && now !== was[key]){ continue }
      el.style.setProperty(key, val);
      was[key] = val;
    }
  }catch(e){}
};
kit.vars.push = function(){
  D.querySelectorAll('iframe').forEach(kit.vars.put);
};
kit.vars.sync = function(){
  if(kit.vars.wait){ return }
  kit.vars.wait = W.requestAnimationFrame(function(){
    kit.vars.wait = 0;
    kit.vars.push();
  });
};
if(W.parent !== W){
  try{
    if(W.parent.kit && W.parent.kit.vars && W.frameElement){ W.parent.kit.vars.put(W.frameElement) }
    kit.vars.pull(W.frameElement);
  }catch(e){}
}
kit.frame = {};
kit.frame.visible = function(i, r, s){
  if(!i || !i.isConnected){ return 0 }
  r = i.getBoundingClientRect();
  if(!r || r.width < 2 || r.height < 2){ return 0 }
  s = W.getComputedStyle(i);
  if(!s || s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0'){ return 0 }
  return 1;
};
kit.frame.active = function(vw, vh, best, bestZ, bestI, r, s, z){
  var hash = (location.hash || '').replace(/^#/, ''), byHash;
  if(hash && (byHash = D.getElementById(hash)) && byHash.tagName === 'IFRAME' && kit.frame.visible(byHash)){ return byHash }
  best = D.querySelector('iframe.main.page') || D.querySelector('iframe.main') || D.querySelector('iframe.page');
  if(best && kit.frame.visible(best)){ return best }
  vw = W.innerWidth || D.documentElement.clientWidth || 0;
  vh = W.innerHeight || D.documentElement.clientHeight || 0;
  D.querySelectorAll('iframe').forEach(function(i, idx){
    var area, visW, visH;
    if(!kit.frame.visible(i)){ return }
    r = i.getBoundingClientRect();
    visW = Math.max(0, Math.min(vw, r.right) - Math.max(0, r.left));
    visH = Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top));
    area = visW * visH;
    if(area <= 0){ return }
    s = W.getComputedStyle(i);
    z = parseInt(s.zIndex, 10);
    z = isNaN(z) ? 0 : z;
    if(!best || z > bestZ || (z === bestZ && area > bestI) || (z === bestZ && area === bestI && idx > (best && best.__kitIdx || -1))){
      best = i;
      bestZ = z;
      bestI = area;
      best.__kitIdx = idx;
    }
  });
  return best || null;
};
kit.frame.isMain = function(i){
  return !!(i && i === kit.frame.active());
};
kit.frame.setMainScroll = function(i,d,b){
  try{
    d = i && i.contentDocument; if(!d){ return }
    i._kitSubLocked = 0;
    b = d.body || d.documentElement;
    d.documentElement.style.overflow = '';
    d.documentElement.style.overscrollBehavior = '';
    if(b){
      b.style.overflow = '';
      b.style.overscrollBehavior = '';
      b.style.touchAction = '';
    }
    i.style.overscrollBehavior = '';
    i.style.touchAction = '';
  }catch(e){}
};
kit.frame.setSubScroll = function(i,d,b){
  try{
    d = i && i.contentDocument; if(!d){ return }
    i._kitSubLocked = 1;
    b = d.body || d.documentElement;
    d.documentElement.style.overflow = 'hidden';
    d.documentElement.style.overscrollBehavior = '';
    if(b){
      b.style.overflow = 'hidden';
      b.style.overscrollBehavior = '';
      b.style.touchAction = '';
    }
    i.style.overscrollBehavior = '';
    i.style.touchAction = '';
  }catch(e){}
};
kit.frame.refresh = function(){
  D.querySelectorAll('iframe').forEach(function(i){
    if(kit.frame.isMain(i)){ kit.frame.setMainScroll(i) }
    else { kit.frame.setSubScroll(i) }
  });
};
kit.frame.lockScroll = function(i,d,b,w,y){
  if(!i){ return }
  function apply(){
    try{
      d = i.contentDocument; w = i.contentWindow;
      if(!d || !w){ return }
      if(kit.frame.isMain(i)){ kit.frame.setMainScroll(i) }
      else { kit.frame.setSubScroll(i) }
    }catch(e){}
  }
  apply();
  i.addEventListener('load', apply);
};
kit.ear('join>iframe',kit.add=function(eve){
  kit.views.set(eve.target.contentWindow, eve.target);
  kit.vars.put(eve.target);
  eve.target.addEventListener('load', function(){ kit.vars.put(eve.target) });
  kit.frame.lockScroll(eve.target);
  kit.frame.refresh();
});
W[ON]('hashchange', kit.frame.refresh);
W[ON]('load', kit.vars.push);
W[ON]('resize', kit.vars.sync);
W[ON]('pageshow', kit.vars.push);
W[ON]('transitionend', kit.vars.push, true);
W[ON]('animationend', kit.vars.push, true);
kit.ear('style',function(eve,i){
  if(!eve.target || !eve.target.style){ return }
  eve.preventDefault();
  var h = (eve.detail||'').height, val;
  if(U !== h && null !== h && '' !== h){
    if(isNaN(h)){ val = h }
    else {
      i = W.getComputedStyle(eve.target);
      h = +h;
      if('border-box' === i.boxSizing){
        h += (parseFloat(i.borderTopWidth)||0) + (parseFloat(i.borderBottomWidth)||0) +
          (parseFloat(i.paddingTop)||0) + (parseFloat(i.paddingBottom)||0);
      }
      val = Math.ceil(h)+'px';
    }
    if(eve.target.style.height !== val){ eve.target.style.height = val }
  }
},document);

;(function(){
var tag=Math.random().toString(36).slice(2),seq=0,job={},pool={},late=[],live=new WeakMap,nav=new WeakMap,busy=new WeakMap,server,skip,seen;
function root(node){ return node === W ? D : node || D }
function read(node, top, body, key){
  if(node !== top){
    body = read(node.parentNode, top, body);
    key = node.getAttribute && node.getAttribute('name');
    if(key && null != body){ body = body[key] }
  }
  return body;
}
function head(node, top, key, name){
  while(node !== top){ name = node.getAttribute && node.getAttribute('name'); if(name){ key = name } node = node.parentNode }
  return key;
}
kit.bind = function(top, body, all, i, node, val){
  top = root(top); top.bound=body; all = top.querySelectorAll('[name]');
  for(i = 0; i < all.length; i += 1){
    node = all[i]; if(null == body || !(head(node, top) in Object(body))){ continue } val = read(node, top, body);
    node.hidden = U === val || null === val || false === val;
    if(node.hidden || val && 'object' === typeof val){ continue }
    if(/^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName)){ node.value = val }
    else { node.textContent = val }
  }
  return top;
};
function url(raw, out){
  out = new URL(raw || location.href, location.href);
  if(DEV ? 'file:' !== out.protocol : location.origin !== out.origin){ throw new TypeError('Kit URL must be local') }
  out.hash = ''; return out.href;
}
function name(raw){raw=''+(raw||'');return '_'===raw[0]?'':raw}
function say(view,msg){skip=msg;kit.say(msg,'http',view);skip=null}
function keep(id, one){
  if(one = job[id]){ return one }
  one = job[id] = {};
  one.stop = setTimeout(function(){ lose(id, 1) }, 5099);
  return one;
}
function lose(id, no, one, list, i){
  if(!(one = job[id])){ return }
  delete job[id]; clearTimeout(one.stop);
  if(one.view){
    list = nav.get(one.view) || [];
    for(i = 0; i < list.length; i += 1){ if(list[i].ask === id){ list.splice(i, 1); break } }
    if(busy.get(one.view) === id){ busy.delete(one.view) }
    pump(one.view);
  }
  if(no && one.no){ one.no(new Error) }
  return one;
}
function done(msg, one, err){
  one = lose(msg.reply);
  if(one && one.ok){
    if(300 > msg.code){ one.ok(msg.body) }
    else { err = new Error(msg.body || msg.code); err.status = msg.code; err.body = msg.body; one.no(err) }
    return;
  }
  if(one && one.back){ say(one.back, msg); return }
  if(W !== W.parent){ kit.up(msg, 'http') }
}
function fail(req, code, body){ done({reply:req.ask, code:code, body:body}) }
function find(want, omit){ return [].filter.call(D.getElementsByName(want), function(i){ return i !== omit && 'IFRAME' === i.tagName }) }
function pump(view, list, req, src){
  if(busy.has(view)){ return }
  list = nav.get(view); if(!list || !list.length){ nav.delete(view); return }
  req = list[0];
  if(live.get(view) !== req.url){
    try{ src = url(view.getAttribute('src')) }catch(err){ src = '' }
    if(src !== req.url || view.readyState){ live.delete(view); view.readyState = 0; view.src = req.url + '#kit' }
    return;
  }
  list.shift(); busy.set(view, req.ask); req.to = ''; say(view, req);
}
function push(view, req, list){
  if(!view || !view.contentWindow){ throw new TypeError }
  try{ if(view.readyState && url(view.contentWindow.location.href) === req.url){ live.set(view, req.url) } }catch(err){}
  list = nav.get(view) || []; list.push(req); nav.set(view, list);
  keep(req.ask).view = view; pump(view);
}
function wake(eve, view, src){
  view = eve.target; if(!view || 'IFRAME' !== view.tagName){ return }
  try{ src = url(eve.detail || view.getAttribute('src')) }catch(err){ return }
  if(src !== url(view.getAttribute('src'))){ return }
  live.set(view, src); pump(view);
}
function seek(req, omit, hit){
  hit = find(req.to, omit);
  if(1 < hit.length){ fail(req, 409); return }
  if(hit.length){ try{ push(hit[0], req) }catch(err){ fail(req, 410) } return }
  if(W !== W.parent){ kit.up(req, 'http'); return }
  fail(req, 404);
}
function take(req, res){
  req.query = kit.querystring.parse(new URL(req.url).search);
  if(!server){ if('loading' === D.readyState){ late.push(req) } else { fail(req, 501) } return }
  seen = 1; res = res || {status:200, sent:0};
  res.end = res.end || function(body){ if(res.sent){ return } res.sent = 1; done({reply:req.ask, code:res.status, body:body}) };
  res.send = function(node, body){ node = root(node); body=node.bound; node.bound=U; res.end(U === body ? (node.nodeType ? req.body : node) : body); return node };
  Promise.resolve().then(function(){ return server(req, res) }).then(function(data){ if(!res.sent){ res.end(data) } }, function(err){ if(!res.sent){ res.status = 500; res.end(err.message || ''+err) } });
}
function drain(no, list){ list = late; late = []; list.forEach(function(req){ no && !server ? fail(req, 501) : take(req) }) }
function ask(req, send){
  return new Promise(function(ok, no, id, one){
    req.ask = id = tag+(++seq); one = keep(id); one.ok = ok; one.no = no;
    try{ send(req) }catch(err){ lose(id); no(err) }
  });
}
function pod(src, view){
  view = pool[src]; if(view && view.isConnected){ return view }
  view = D[HI]('iframe'); view.hidden = true; view.src = src + '#kit'; (D.body || D.documentElement).appendChild(view);
  return pool[src] = view;
}
kit.fetch = function(to, body, target, view, src, req, aim){
  try{
    if(to && 'IFRAME' === to.tagName){ view = to; src = view.getAttribute('src'); if(!src){ throw new TypeError('Kit iframe needs a URL') } }
    else { src = to }
    src = url(src); req = {url:src, body:body, to:''};
    if(view){ return ask(req, function(msg){ push(view, msg) }) }
    if(target && 'IFRAME' === target.tagName){ return ask(req, function(msg){ push(target, msg) }) }
    if(target){
      aim = name(target);
      if(!aim){ return Promise.reject(Object.assign(new Error(400), {status:400})) }
      req.to = aim; return ask(req, function(msg){ seek(msg) });
    }
    return ask(req, function(msg){ push(pod(src), msg) });
  }catch(err){ return Promise.reject(err) }
};
kit.createServer = function(fn){
  server = fn || function(){}; Promise.resolve().then(drain);
  if(location.search && '#kit' !== location.hash){ W[ON]('load', function(){ if(seen){ return } take({url:location.href, body:kit.querystring.parse(location.search)}, {status:200, end:function(){}}) }) }
};
kit.ears.http = 1;
D[ON]('ready', wake);
W[ON]('http', function(eve, msg, src, one){
  msg = eve.detail; if(!msg || skip === msg){ return }
  if(msg.reply){ done(msg); return } if(!msg.ask){ return }
  src = eve.target && 'IFRAME' === eve.target.tagName ? eve.target : null;
  if(src){ one = keep(msg.ask); one.back = src }
  msg.to ? seek(msg, src) : take(msg);
});
W[ON]('DOMContentLoaded', function(){ drain(1) });

function fields(f, data){ data = {}; new FormData(f).forEach(function(val, key){ data[key] = U === data[key] ? val : [].concat(data[key], val) }); return data }
W[ON]('submit', function(eve, f, aim){
  f = eve.target; aim = f && name(f.target);
  if(!aim || 'FORM' !== f.tagName || 'post' !== f.method || eve.defaultPrevented){ return }
  eve.preventDefault();
  kit.fetch(f.action, fields(f), aim);
});
}());

location.__dirname = location.href.split('/').slice(0,-1).join('/');
Object.defineProperty(location, 'path', {
  get:function(){ return kit.path },
  set:function(path, view){
    if(!path){ return }
    path = path.replace(location.__dirname,'').replace(/^\.?\//,'');
    if(kit.path === (kit.path = path)){ return }
    view = D.getElementById(path);
    if(!view){ view = D[HI]('iframe'); view.id = path; view.src = path; D.body.appendChild(view) }
    D.querySelectorAll('.main').forEach(function(one){ one.classList.remove('main') });
    view.classList.add('main','page');
    if(location.hash.slice(1) !== path){ location.hash = path }
    kit.frame.refresh();
  }
});

kit.querystring = {
  parse: function(qs){ return Object.fromEntries(new URLSearchParams(qs)) }
}
kit.fs = {files:{},
  createReadStream(url){ url = (url||'').replace(location.__dirname+'/','').split('#')[0];
    var data = this.files[url], end = 0, tmp;
    return {_:{},
      on(eve,cb){ this._[eve] = cb; 'open'==eve&&setTimeout(cb, 0); return this },
      pipe(dest){ var rs = this, i;
        if(end){ return dest } end = 1;
        function load(){ (data = i).onload = 0;;
          if(!data){ return (tmp=rs._.error)&&tmp({code:'ENOENT'}) }
          (tmp=rs._.data)&&tmp(data);
          (tmp=rs._.end)&&tmp();
          dest.end(data);
        };
        if(i = D[ID](url)){ setTimeout(load,0) }
        else {
          (i = D[HI]('iframe')).onload = load
          i.id = (i.src = url)/*.replace('.html','')*/; D.body.appendChild(i);
        }
        //setTimeout(i.onload,0);
        return dest;
      }
    };
  }, readFileSync: function(path){

  }, readFile: function(path,opt,cb){

  }, writeFileSync: function(path,data){

  }, writeFile: function(path,data,opt,cb){

  }, createWriteStream: function(path,opt){

  }, readdir: function(path,cb){

  }
};

W[ON]('DOMContentLoaded',function(m){
  m=D.body;m.classList.add('main','page'); m.id = (kit.path = location.href.replace(location.__dirname+'/','').split('#')[0]);
  (function(){ function change(eve){ eve = eve||''; eve = eve.detail||eve.data||eve;
    var hash = (eve.newURL||'').split('#')[1]||'';
    if('.' == hash[0]){ location.hash = hash.slice(1); return; }
    if('/' == hash[0]){ location.hash = hash.slice(1); return; }
    if(!eve && !hash){ return }
    location.path = hash;
    eve && kit.up({newURL: eve.newURL, oldURL: eve.oldURL},'hashchange');
  }; W[ON]('hashchange',change) }());
  kit.frame.refresh();
});
var p = HTMLIFrameElement.prototype, _ifL;
while(p && !(_ifL = Object.getOwnPropertyDescriptor(p, 'onload'))) p = Object.getPrototypeOf(p);
_ifL = _ifL || {};
Object.defineProperty(HTMLIFrameElement.prototype, 'onload', {
  set: function(fn) {
    var i = this;
    if(i.contentWindow) kit.views.set(i.contentWindow, i);
    if (!fn) return _ifL.set ? _ifL.set.call(i, fn) : (i.onloaded = fn);
    var w = function(e) {
      if(i.readyState) return fn.call(i, e);
      var r = function(){ if(r.d) return; r.d = 1; fn.call(i, e) };
      kit.ear('ready', function(){ i.readyState = 1; r() }, i);
      setTimeout(r, 99);
    };
    _ifL.set ? _ifL.set.call(i, w) : i.addEventListener('load', w);
  }
});
kit.up(location.href,'ready');
}());

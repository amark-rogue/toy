;(function(O){
kit.createServer(function(req, res){
  res.send(kit.bind(document, O.hear(req.body)));
});

var B = document.body, page = B.all('#page')[0], addr = B.all('#addr')[0];
var port, path, file, id = Math.random().toString(36).slice(2, 8);

O.data = function(kind, msg, body){
  body = {addr:addr.value, load:false, err:false, page:false};
  if(kind){ body[kind] = 'page' === kind ? {} : msg }
  return O.now = {body:body};
};
O.put = function(data){ return kit.bind(document, data || O.now || O.data()) };
O.stop = function(){ page.removeAttribute('src'); page.srcdoc = '' };

O.arg = function(raw, lines, i, m){
  if(raw && 'object' === typeof raw){ raw = raw.file || raw.cmd || raw.raw || raw.$ || '' }
  raw = String(raw || '').replace(/\x1B(?:\[[0-?]*[ -\/]*[@-~]|\][^\x07]+\x07)/g, '');
  lines = raw.split(/\r\n|\r|\n/);
  for(i = 0; i < lines.length; i += 1){
    m = lines[i].match(/(?:^|[$#>%]\s*)open\s+(["']?)(.*?)\1\s*$/i);
    if(m && m[2]){ return m[2].trim() }
  }
  return '';
};

O.load = function(url, m, msg){
  url = url || addr.value || '';
  if(!url){ return O.data() }
  O.stop();
  m = url.match(/^(?:(?:localhost|127\.0\.0\.1):)?(\d+)(\/.*)?$/);
  if(!m){
    file = url; addr.value = file; msg = 'opening ' + file + '...';
    kit.say({id:id, file:file}, 'fetch');
    return O.data('load', msg);
  }
  port = m[1]; path = m[2] || '/'; addr.value = 'localhost:' + port + path;
  msg = 'fetching localhost:' + port + path + '...';
  kit.say({id:id, port:port, path:path}, 'fetch');
  return O.data('load', msg);
};

O.safe = function(html, doc, meta){
  doc = new DOMParser().parseFromString(html, 'text/html'); // SECURITY: note that parsing itself does not execute it, which is good. DO NOT INSERT THIS INTO A TRUSTED DOCUMENT it can ONLY be assigned to a `srcdoc`!
  meta = B.all('#safe')[0].content;
  doc.head.insertBefore(doc.importNode(meta, true), doc.head.firstChild); // Inject meta-headers to restrict things.
  return new XMLSerializer().serializeToString(doc); // tho note, parsing just to re-stringify is kinda inefficient, is it possible to just prepend the restricted header tags or regexp it in?
};

O.html = function(html){
  html = String(html || '');
  if(!html.trim()){ O.stop(); return O.data('err', 'empty content') }
  page.removeAttribute('src'); page.srcdoc = O.safe(html);
  return O.data('page');
};

O.frame = async function(url, back, reg, get, why){
  await Promise.resolve();
  if(navigator.serviceWorker){
    try{
      url = new URL(url, location.href);
      if(url.origin !== location.origin || url.pathname.indexOf('/opfs/') < 0){ throw Error('preview URL must be local OPFS') }
      reg = await navigator.serviceWorker.register('../sw.js', {scope:'/', updateViaCache:'none'});
      await reg.update(); await navigator.serviceWorker.ready;
      if(!navigator.serviceWorker.controller){ await new Promise(function(done){
        var stop = setTimeout(done, 3000);
        navigator.serviceWorker.addEventListener('controllerchange', function(){ clearTimeout(stop); done() }, {once:true});
      }) }
      get = await fetch(url.href, {cache:'no-store', credentials:'omit', redirect:'error', referrerPolicy:'no-referrer'});
      if(!get.ok){
        if(back){ O.put(O.html(back)); return }
        why = await get.text(); O.put(O.data('err', 'open: could not read file from OPFS (' + get.status + '): ' + why)); return;
      }
      O.put(O.html(await get.text())); return;
    }catch(err){
      O.put(back ? O.html(back) : O.data('err', 'open: ' + (err.message || err))); return;
    }
  } else if(back){ O.put(O.html(back)); return }
  O.put(O.data('err', 'open: isolated preview is unavailable'));
};

O.hear = function(data, name){
  data = data || {};
  if(data.id && data.id !== id){ return O.now || O.data() }
  if(data.port && data.path){ port = data.port; path = data.path || '/'; return O.load('localhost:' + port + path) }
  if('string' === typeof data || data.cmd || data.raw || data.$){ name = O.arg(data); return name ? O.load(name) : O.data() }
  if(data.url){ addr.value = data.file || file; O.frame(data.url, data.html); return O.data('load', 'opening ' + addr.value + '...') }
  if(data.html){ return O.html(data.html) }
  if(data.err){ O.stop(); return O.data('err', data.err) }
  return O.now || O.data();
};
kit.ear('open', function(eve){ O.put(O.hear(eve.detail || eve.data)) });
B.all('#go,#ref').ear('click', function(){ O.put(O.load()) });
addr.ear('keydown', function(eve){ if('Enter' === eve.key){ O.put(O.load()) } });
}(window.OPEN = {}));

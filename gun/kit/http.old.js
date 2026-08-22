kit.http = {createServer: function(h){
  h.listen = function(port,ip,cb){cb&&cb()};
  return kit.server = h;
},serve: function(req, res){ if(W.parent !== W){ return }
  kit.fs.createReadStream(req.url).pipe(res);
},req:function(path,body){ return this._last={url:path,
  method:body?'POST':'GET',body:body,
  headers:{},rawHeaders:[],rawTrailers:[],
  socket:tmp={},client:tmp,connection:tmp,
  resume: function(){},
  pause: function(){},
  isPaused: function(){}
}},res:function(end){ return {_req:this._last,
  end: end||kit.http.end,
  getHeader: function(){},
  setHeader: function(name, value){},
  writeHead: function(statusCode,headers){},
  write: function(data){},
  pipe: function(){}
}},end:function(data,id,i){
  id = this._req.url.replace(location.__dirname,'').replace('file://','')/*.replace('.html','')*/.split('#')[0];
  //console.log("http.end", id, data, 'URL:', this._req.url);
  //(i = ((data||'').src? data : (D[ID](id) || D[HI]('iframe')))).id || (i.id = id);
  (i = D[ID](id) || D[HI]('iframe')).id || (i.id = id);
  D.querySelectorAll('.main').forEach(function(e){ e.classList.remove('main') });
  i.className = 'main page'; i.src||(i===D.body)||(i.srcdoc = data, D.body.appendChild(i)); location.hash = i.id; // TODO: BUG? Prevent double hash change
  kit.frame && kit.frame.refresh && kit.frame.refresh();
}};
W[ON]('submit', function(eve, act){ eve.preventDefault();
  act = (eve.target.action||'').replace(location.__dirname+'/','').split('#')[0];
  //console.log(location.pathname.split('/').slice(-1)[0], 'submit', act);
  (kit.server||kit.http.serve)(
    kit.http.req(act,Object.fromEntries(new FormData(eve.target))),
    kit.http.res()
  );
}
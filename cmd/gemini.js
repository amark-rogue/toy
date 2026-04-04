var cp = require('child_process');

function Gemini(c){
  var self = this;
  self.c = c; self.id = 1; self.sid = null; self.buf = '';
  self.proc = cp.spawn('gemini',['--acp'],{stdio:['pipe','pipe','pipe']});
  self.proc.stdout.on('data',function(d){ self.onData(d) });
  self.proc.on('close',function(){self.proc = null });
  self.rpc('initialize',{protocolVersion:1,clientInfo:{name:'toy',version:'1.0'},capabilities:{}},function(r){
    self.rpc('authenticate',{methodId:'oauth-personal'},function(){
      self.ready = 1;
      if(self.pending) self.go(self.pending);
    });
  });
}
Gemini.prototype.rpc = function(m,p,cb){
  var id = this.id++; if(cb) this['_cb'+id] = cb;
  var msg = JSON.stringify({jsonrpc:'2.0',id:id,method:m,params:p||{}});
  this.proc && this.proc.stdin.write(msg+'\n');
};
Gemini.prototype.respond = function(id,r){
  this.proc && this.proc.stdin.write(JSON.stringify({jsonrpc:'2.0',id:id,result:r||{}})+'\n');
};
Gemini.prototype.onData = function(d){
  this.buf += d.toString(); var lines = this.buf.split('\n'), self = this;
  this.buf = lines.pop();
  lines.forEach(function(l){ if(!l.trim()) return; try{ self.onMsg(JSON.parse(l)) }catch(e){ console.log('[gemini] parse err:', l.slice(0,100)) } });
};
Gemini.prototype.onMsg = function(m){
  // response to our rpc call
  if(m.id && !m.method){
    if(this['_cb'+m.id]){ this['_cb'+m.id](m.result,m.error); delete this['_cb'+m.id] }
    return;
  }
  // server requesting something from us (has id + method)
  if(m.id && m.method){
    if(m.method === 'session/request_permission'){
      var opts = ((m.params||{}).permissions||[{}])[0].options || [];
      var allow = opts.find(function(o){ return o.kind === 'allow_always' }) || opts.find(function(o){ return o.kind === 'allow_once' }) || opts[0];
      this.respond(m.id, {outcome:{outcome:'selected',optionId:(allow||{}).optionId||''}});
    } else {
      this.respond(m.id, {});
    }
    return;
  }
  // notification (no id)
  if(m.method === 'session/update'){
    var u = (m.params||{}).update||{};
    var t = u.sessionUpdate||'';
    this.c.send(JSON.stringify({type:'gemini-event',data:u}));
    return;
  }
};
Gemini.prototype.go = function(opt){
  var self = this;
  var prompt = opt.prompt, cwd = opt.cwd, sid = opt.sid;
  if(!self.ready){ self.pending = opt; return }
  self.pending = null;
  // resume existing session by id
  if(sid && sid !== self.sid){
    self.rpc('session/load',{sessionId:sid},function(r,e){
      self.sid = sid;
      self.prompt(prompt);
    });
    return;
  }
  // continue current session
  if(self.sid){
    self.prompt(prompt);
    return;
  }
  // new session
  self.rpc('session/new',{cwd:cwd||process.cwd(),mcpServers:[]},function(r){
    self.sid = (r||{}).sessionId||null;
    self.c.send(JSON.stringify({type:'gemini-event',data:{sessionUpdate:'session-init',sessionId:self.sid}}));
    self.rpc('session/set_mode',{sessionId:self.sid,modeId:'yolo'},function(){
      self.prompt(prompt);
    });
  });
};
Gemini.prototype.prompt = function(txt){
  var self = this;
  self.rpc('session/prompt',{sessionId:self.sid,prompt:[{type:'text',text:txt}]},function(r,e){
    self.c.send(JSON.stringify({type:'gemini-done',sessionId:self.sid}));
  });
};
Gemini.prototype.cancel = function(){
  if(this.sid){
    // session/cancel is a notification, not a request
    this.proc && this.proc.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'session/cancel',params:{sessionId:this.sid}})+'\n');
  }
};
Gemini.prototype.kill = function(){ if(this.proc){ console.log('[gemini] kill'); this.proc.kill(); this.proc = null } };

module.exports = function(c, json, cwd){
  if(!c.gemini) c.gemini = new Gemini(c);
  c.gemini.go({prompt:json.prompt, sid:json.session||null, cwd:json.cwd||cwd});
};

module.exports.check = function(c){
  try{ cp.execSync('gemini --version',{timeout:3000,stdio:'pipe'}); console.log('[gemini] check: ok'); c.send(JSON.stringify({type:'gemini-auth',ok:true})); }
  catch(e){ c.send(JSON.stringify({type:'gemini-auth',ok:false})); }
};

module.exports.stop = function(c){
  if(c.gemini) c.gemini.cancel();
};

module.exports.close = function(c){
  if(c.gemini) c.gemini.kill();
};

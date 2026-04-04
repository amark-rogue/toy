var cp = require('child_process');

function Codex(c){
  var self = this;
  console.log('[codex] spawn app-server');
  self.c = c; self.id = 1; self.tid = null; self.buf = ''; self.ready = 0; self.pending = null;
  self.proc = cp.spawn('codex',['app-server'],{stdio:['pipe','pipe','pipe']});
  self.proc.stdout.on('data',function(d){ self.onData(d) });
  self.proc.stderr.on('data',function(d){ console.log('[codex] stderr:',d.toString().trim()) });
  self.proc.on('close',function(){ console.log('[codex] process closed'); self.proc = null });
  self.rpc('initialize',{clientInfo:{name:'toy',version:'1.0'},capabilities:{}},function(){
    console.log('[codex] initialized');
    self.notify('initialized');
    self.ready = 1;
    if(self.pending) self.go(self.pending);
  });
}
Codex.prototype.rpc = function(m,p,cb){
  var id = this.id++; if(cb) this['_cb'+id] = cb;
  var msg = JSON.stringify({jsonrpc:'2.0',id:id,method:m,params:p||{}});
  console.log('[codex] rpc:', m);
  this.proc && this.proc.stdin.write(msg+'\n');
};
Codex.prototype.notify = function(m,p){
  this.proc && this.proc.stdin.write(JSON.stringify({jsonrpc:'2.0',method:m,params:p||{}})+'\n');
};
Codex.prototype.respond = function(id,r){
  this.proc && this.proc.stdin.write(JSON.stringify({jsonrpc:'2.0',id:id,result:r||{}})+'\n');
};
Codex.prototype.onData = function(d){
  this.buf += d.toString(); var lines = this.buf.split('\n'), self = this;
  this.buf = lines.pop();
  lines.forEach(function(l){ if(!l.trim()) return; try{ self.onMsg(JSON.parse(l)) }catch(e){} });
};
Codex.prototype.onMsg = function(m){
  if(m.id && this['_cb'+m.id]){ this['_cb'+m.id](m.result,m.error); delete this['_cb'+m.id]; return }
  if(m.id && m.method){
    if(m.method.includes('requestApproval')) this.respond(m.id,{decision:'approve'});
    else this.respond(m.id,{});
    return;
  }
  // extract threadId from thread/started notification
  var p = m.params||{};
  if(m.method === 'thread/started' && p.thread && p.thread.id){
    this.tid = p.thread.id;
    console.log('[codex] thread:', this.tid);
  }
  console.log('[codex] event:', m.method);
  this.c.send(JSON.stringify({type:'codex-event',data:{type:m.method,params:p}}));
  if(m.method === 'turn/completed' || m.method === 'turn/aborted'){
    console.log('[codex] done');
    this.c.send(JSON.stringify({type:'codex-done',threadId:this.tid}));
  }
};
Codex.prototype.go = function(opt){
  var self = this;
  if(!self.ready){ self.pending = opt; return }
  self.pending = null;
  var prompt = opt.prompt, tid = opt.tid, cwd = opt.cwd;
  console.log('[codex] go:', prompt, 'tid:', tid||self.tid);
  if(tid){ self.tid = tid;
    self.rpc('thread/resume',{threadId:tid,approvalPolicy:'on-request',sandbox:'danger-full-access'},function(){ self.turn(prompt) });
  } else if(self.tid){
    self.turn(prompt);
  } else {
    self.rpc('thread/start',{model:null,cwd:cwd||process.cwd(),approvalPolicy:'on-request',sandbox:'danger-full-access'},function(r){
      var id = (r||{}).threadId || null;
      if(id) self.tid = id;
      console.log('[codex] thread/start cb, tid:', self.tid);
      self.c.send(JSON.stringify({type:'codex-event',data:{type:'thread-init',threadId:self.tid}}));
      // wait briefly for thread/started notification to arrive with the real tid
      setTimeout(function(){ self.turn(prompt) }, 500);
    });
  }
};
Codex.prototype.turn = function(p){
  console.log('[codex] turn:', p, 'tid:', this.tid);
  this.rpc('turn/start',{threadId:this.tid,input:[{type:'text',text:p,text_elements:[]}]});
};
Codex.prototype.interrupt = function(){ if(this.tid) this.rpc('turn/interrupt',{threadId:this.tid}) };
Codex.prototype.kill = function(){ if(this.proc){ console.log('[codex] kill'); this.proc.kill(); this.proc = null } };

module.exports = function(c, json, cwd){
  if(!c.codex) c.codex = new Codex(c);
  c.codex.go({prompt:json.prompt, tid:json.thread||null, cwd:json.cwd||cwd});
};

module.exports.check = function(c){
  try{ cp.execSync('codex --version',{timeout:3000,stdio:'pipe'}); console.log('[codex] check: ok'); c.send(JSON.stringify({type:'codex-auth',ok:true})); }
  catch(e){ console.log('[codex] check: not found'); c.send(JSON.stringify({type:'codex-auth',ok:false})); }
};

module.exports.stop = function(c){
  console.log('[codex] stop');
  if(c.codex) c.codex.interrupt();
};

module.exports.close = function(c){
  if(c.codex) c.codex.kill();
};

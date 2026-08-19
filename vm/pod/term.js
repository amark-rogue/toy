// Adapt Nodepod's terminal stream to the app's existing PTY framing.

;(function(pod){

pod.tip = function(cwd){
  demo.cwd = cwd || demo.home;
  try{ localStorage.setItem('demo.cwd', demo.cwd) }catch(e){}
  pod.idle = 1;
  if(pod.yes){ pod.yes(); pod.yes = 0 }
  return demo.path.tip();
};

pod.Tty = function(){
  this.cols = 80;
  this.rows = 24;
  this.key = 0;
  this.size = 0;
  this.options = {};
  pod.tty = this;
};

pod.Tty.prototype.open = function(){};
pod.Tty.prototype.focus = function(){};
pod.Tty.prototype.dispose = function(){};
pod.Tty.prototype.loadAddon = function(){};
pod.Tty.prototype.clear = function(){ this.write('\x1b[3J\x1b[H\x1b[2J') };
pod.Tty.prototype.onData = function(fn){
  this.key = fn;
  return {dispose: function(){}};
};
pod.Tty.prototype.onResize = function(fn){
  this.size = fn;
  return {dispose: function(){}};
};
pod.Tty.prototype.resize = function(cols, rows){
  this.cols = cols || this.cols;
  this.rows = rows || this.rows;
  if(this.size) this.size({cols: this.cols, rows: this.rows});
};
pod.Tty.prototype.write = function(raw){
  if(pod.mute || pod.skip) return;
  raw = '' + (raw == null ? '' : raw);
  if(pod.line && '\r\n' === raw){
    pod.line = 0;
    return;
  }
  if(pod.cmd && raw.indexOf('\r\n') >= 0){
    pod.cmd = 0;
    raw = raw.replace('\r\n', '\r\n' + demo.pty.off + '\r');
  }
  demo.push(raw);
};
pod.Tty.prototype.writeln = function(raw){ this.write((raw || '') + '\r\n') };

pod.size = function(size){
  if(!size) return;
  if(pod.tty) pod.tty.resize(Number(size.cols) || 80, Number(size.rows) || 24);
};

pod.port = function(port){
  port = '' + port;
  if(!VM.srv || VM.srv.ports[port]) return;
  VM.srv.ports[port] = {at: Date.now()};
  kit.say({name: 'port:' + port, prompt: 'open ' + port}, 'belt');
  kit.say('Server on port ' + port, 'help');
};

pod.send = function(raw, hide){
  raw = '' + (raw == null ? '' : raw);
  if(pod.idle && /[\r\n]$/.test(raw)){
    pod.idle = 0;
    pod.cmd = hide ? 0 : 1;
    pod.line = hide ? 1 : 0;
    pod.skip = hide ? 1 : 0;
    pod.term.input(raw);
    pod.skip = 0;
    return;
  }
  pod.term.input(raw);
};

}(demo.pod));

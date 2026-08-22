// Rich demo shell state and route choice.

;(function(pod){

pod.on = 0;
pod.hot = 0;
pod.bad = 0;
pod.get = 0;
pod.net = 0;
pod.made = 0;
pod.pod = 0;
pod.term = 0;
pod.tty = 0;
pod.mute = 1;
pod.skip = 0;
pod.line = 0;
pod.idle = 1;
pod.lock = 0;
pod.todo = {};
pod.tick = 0;
pod.see = 0;
pod.yes = 0;
pod.sown = 0;
pod.rev = -1;

pod.fast = {
  aid: 1,
  cat: 1, cd: 1, clear: 1, cp: 1, echo: 1, help: 1,
  ls: 1, mkdir: 1, open: 1, pwd: 1, rm: 1, touch: 1,
  apk: 1, pip: 1
};

// bins that stay on the browser path even once the richer shell owns the screen
pod.kept = {aid: 1};

// last segment wins: cd ~ && aid x is an aid command
pod.bin = function(cmd){
  cmd = (cmd || '').trim();
  var seg = (cmd.split(/\s*(?:&&|;)\s*/).pop() || '').split(/\s+/)[0];
  return seg.toLowerCase();
};

pod.use = function(cmd){
  if(pod.kept[pod.bin(cmd)]) return 0;
  if(pod.on) return 1;
  if(!window.Worker) return 0;
  cmd = (cmd || '').trim();
  if(!cmd) return 0;
  if(/[|<>`$(){}*?\[\]]/.test(cmd) || /(^|;)\s*(?:if|for|while|case|until|function)\b/.test(cmd)) return 1;
  var bin = (cmd.match(/^\s*([^\s;]+)/) || [])[1] || '';
  bin = bin.toLowerCase();
  if(/^(?:node|npm|npx|pnpm|yarn|bun|bunx|git)$/.test(bin)) return 1;
  return !pod.fast[bin];
};

pod.buf = function(data){
  if(data instanceof Uint8Array) return data;
  if(data instanceof ArrayBuffer) return new Uint8Array(data);
  if(data && data.buffer){
    return new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength);
  }
  return '' + (data == null ? '' : data);
};

pod.drop = function(path){
  return /(?:^|\/)(?:node_modules|\.cache|\.npm)(?:\/|$)/.test(path || '');
};

pod.wait = function(fn, soon){
  if(window.requestIdleCallback){
    return requestIdleCallback(fn, {timeout: soon || 800});
  }
  return setTimeout(fn, Math.min(soon || 80, 80));
};

}(demo.pod));

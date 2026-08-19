// Start, feed and stop the richer shell.

;(function(pod){

pod.start = async function(raw){
  var cmd = (raw || '').replace(/[\r\n]+$/, '').trim();
  var old = /^(?:git\s+clone|npm\s+install)\b/.test(cmd);
  var late = 0;
  var tick = old ? 0 : setTimeout(function(){
    late = 1;
    demo.push(cmd + '\r\n' + demo.pty.off + '\rLoading browser shell...\r\n');
  }, 180);
  try{
    await pod.prep();
    await pod.seed();
    clearTimeout(tick);
    pod.on = 1;
    pod.mute = 0;
    pod.watch();
    pod.send(raw, late);
  }catch(e){
    clearTimeout(tick);
    if(old) return 0;
    var why = 'demo: richer shell unavailable: ' + (e.message || e);
    if(late){ demo.push(why + '\r\n' + demo.path.tip()) }
    else demo.echo(cmd, why + '\n');
  }
  return 1;
};

pod.stop = function(){
  if(pod.see && pod.see.close) pod.see.close();
  pod.see = 0;
  if(pod.pod && pod.pod.teardown) pod.pod.teardown();
  pod.pod = 0;
  pod.term = 0;
  pod.tty = 0;
  pod.on = 0;
  pod.hot = 0;
  pod.get = 0;
  pod.sown = 0;
  pod.rev = -1;
};

}(demo.pod));

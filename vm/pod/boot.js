// Fetch and boot the integrity-pinned Nodepod runtime.

;(function(pod){

pod.cdn = function(){
  if(window.Nod && window.Nod.Nodepod) return Promise.resolve(window.Nod.Nodepod);
  if(pod.net) return pod.net;
  pod.net = new Promise(function(yes, no){
    var s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://cdn.jsdelivr.net/npm/@scelar/nodepod@1.9.20/dist/index.mjs';
    s.integrity = 'sha384-cjt1LxA7H+4jtQlxe3zVIM76OEV8g+80WNApxVgkJr1EDd9yk5MqMHBuwWhlFcEl';
    s.crossOrigin = 'anonymous';
    s.async = true;
    s.onload = function(){
      var set = document.createElement('script');
      set.type = 'module';
      set.src = demo.base + 'pod/main.js';
      set.onload = function(){
        if(window.Nod && window.Nod.Nodepod) yes(window.Nod.Nodepod);
        else no(Error('Nodepod did not load'));
      };
      set.onerror = function(){ no(Error('Nodepod bridge could not load')) };
      document.head.appendChild(set);
    };
    s.onerror = function(){ no(Error('Nodepod could not load')) };
    document.head.appendChild(s);
  }).catch(function(err){
    pod.net = 0;
    throw err;
  });
  return pod.net;
};

pod.prep = function(){
  if(pod.get) return pod.get;
  pod.get = pod.cdn().then(async function(Pod){
    var sab = !!window.crossOriginIsolated && 'function' === typeof window.SharedArrayBuffer;
    var opt = {
      headless: true,
      serviceWorker: false,
      watermark: false,
      rewriteTerminalUrls: false,
      workdir: demo.home,
      packageStore: 'auto',
      enableSharedArrayBuffer: sab,
      sharedVFSBufferSize: 32 * 1024 * 1024,
      preloadEsbuild: false,
      env: {HOME: demo.home, USER: 'demo', TERM: 'xterm-256color', SHELL: '/bin/sh'},
      memory: {
        budgetMB: 128,
        transformCacheSize: 96,
        transformCacheMaxBytes: 6 * 1024 * 1024,
        moduleSoftCacheSize: 192,
        maxProcessOutputBytes: 2 * 1024 * 1024
      },
      shell: {limits: {
        maxOutputBytes: 2 * 1024 * 1024,
        maxPipelineBufferBytes: 512 * 1024,
        maxExpansionBytes: 512 * 1024,
        maxFilesystemEntries: 50000,
        maxJobs: 24,
        maxProcesses: 32
      }},
      onServerReady: function(port){ pod.port(port) }
    };
    if(sab) opt.spawnSnapshot = 'lean';
    pod.pod = await Pod.boot(opt);
    pod.term = pod.pod.createTerminal({
      Terminal: pod.Tty,
      autoPrompt: false,
      prompt: pod.tip,
      customCommands: {open: function(){ return '' }}
    });
    pod.term.attach(document.body);
    await new Promise(function(yes){
      pod.yes = yes;
      pod.term.input(':\r');
    });
    pod.hot = 1;
    if(demo.opfs.root) await pod.seed();
    return pod.pod;
  }).catch(function(err){
    pod.bad = err;
    pod.get = 0;
    throw err;
  });
  return pod.get;
};

}(demo.pod));

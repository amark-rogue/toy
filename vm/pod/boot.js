// Fetch and boot the integrity-pinned Nodepod runtime.

;(function(pod){

pod.url = 'https://cdn.jsdelivr.net/npm/@scelar/nodepod@1.9.20/dist/index.mjs';
pod.hash = {};
pod.hash[pod.url] = 'sha384-cjt1LxA7H+4jtQlxe3zVIM76OEV8g+80WNApxVgkJr1EDd9yk5MqMHBuwWhlFcEl';
pod.hash['https://cdn.jsdelivr.net/npm/@scelar/nodepod@1.9.20/dist/index-Hb-kcVQ0.js'] = 'sha384-XtnkEY7IT2yTVuRHTzzgtO/9U/3gblcmCL4gFLo//NoY8vE6idoQqHBMOhQZsu8c';
pod.hash['https://cdn.jsdelivr.net/npm/@scelar/nodepod@1.9.20/dist/nodepod--d9K1aIF.js'] = 'sha384-5GaBC9MMQmZwG3QxWLL0rWJCgNl5NpmeKj/tzXsgAAlhwZyuevgKHFj8QTik7ni5';
pod.hash['https://cdn.jsdelivr.net/npm/@scelar/nodepod@1.9.20/dist/esbuild-DYYwBcdT.js'] = 'sha384-dJgRnKpHffnjZB1eJG0KiNH0EUL46gm6BXAplb7HGYVn2ioA5HclDT6/Sdx1HXCh';
pod.hash['https://cdn.jsdelivr.net/npm/@scelar/nodepod@1.9.20/dist/child_process-CSG284DD.js'] = 'sha384-ECf/4tF4TMgog+IdF46Yg/RRBmW9e0mOJh1TpmP2yrvtMewVTkLYepRwCs4IntbX';

pod.map = function(){
  if(pod.made) return;
  var s = document.createElement('script');
  s.type = 'importmap';
  s.textContent = JSON.stringify({integrity: pod.hash});
  document.head.appendChild(s);
  pod.made = 1;
};

pod.cdn = function(){
  if(window.Nod && window.Nod.Nodepod) return Promise.resolve(window.Nod.Nodepod);
  if(pod.net) return pod.net;
  pod.map();
  pod.net = new Promise(function(yes, no){
    var s = document.createElement('script');
    s.type = 'module';
    s.src = pod.url;
    s.integrity = pod.hash[pod.url];
    s.crossOrigin = 'anonymous';
    s.async = true;
    s.onload = function(){
      import(pod.url).then(function(Pod){
        window.Nod = Pod;
        if(Pod.Nodepod) yes(Pod.Nodepod);
        else no(Error('Nodepod did not load'));
      }, no);
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

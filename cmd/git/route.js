;(function(G){
G.cmd = function(line, cmd, all, i){
  cmd = line && line.cmd ? line.cmd() : '' + (line || '');
  all = cmd.split(/\s*(?:&&|;|\|)\s*/);
  for(i = all.length - 1; 0 <= i; i -= 1){
    if(/^git(?:\s|$)/i.test(all[i])){ return all[i].trim() }
  }
  return cmd.trim();
};

G.bad = function(raw, cmd){
  if(!/^git\s+status(?:\s|$)/i.test(cmd || '')){ return }
  return /(?:^|\n)\s*(?:fatal|error):|not a git repository|command not found|(?:^|\s)(?:sh:\s*)?git:\s*not found|not recognized|no such file or directory|permission denied/i.test(raw || '');
};

G.route = function(raw, flat, line, cmd){
  raw = raw || '';
  flat = raw.flat ? raw.flat() : '' + raw;
  line = flat.split(/\r\n|\n|\r/)[0] || '';
  cmd = G.cmd(line);
  if(G.bad(flat, cmd)){ G.try(); return }
  if(G.show){ G.show(raw); return }
  (G.wait = G.wait || []).push(raw);
};

kit.http.createServer(function(req){
  G.route((req.body || {}).$);
}).listen();
}(window.GIT = window.GIT || {}));

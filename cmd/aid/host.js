// Same-task shell transport for the browser fallback on a host without aid.

window.aid = window.aid || {};

;(function(H){
H.on = 0; H.seq = 0; H.line = Promise.resolve(); H.wait = {};

H.kind = function(raw, all, i, row){
  raw = ('' + (raw && (raw.raw || raw.$) || raw || '')).replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, '');
  all = raw.split(/\r\n|\n|\r/);
  for(i = 0; i < all.length; i += 1){
    row = all[i];
    if(/(?:^|:\s)aid\s*:\s*the\s+term\s+['"]aid['"]\s+is\s+not\s+recognized/i.test(row)){ return 'ps' }
    if(/['"]aid['"]\s+is\s+not\s+recognized/i.test(row)){ return 'ps' }
    if(/(?:^|:\s)(?:\d+:\s*)?aid:\s*(?:(?:command\s+)?not\s+found|no\s+such\s+file)(?:\s|$)/i.test(row)){ return 'sh' }
    if(/command\s+not\s+found:\s*aid(?:\s|$)/i.test(row)){ return 'sh' }
    if(/unknown\s+command:\s*aid(?:\s|$)/i.test(row)){ return 'sh' }
  }
  return '';
};
H.miss = function(raw){ return !!H.kind(raw) };

H.ask = function(raw, all, i, hit){
  raw = ('' + (raw && (raw.raw || raw.$) || raw || '')).replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, '');
  all = raw.split(/\r\n|\n|\r/);
  for(i = 0; i < all.length; i += 1){
    hit = all[i].match(/(?:^|[$#>%]\s+|(?:&&|[;|])\s*)aid(?:\s+(.*))?\s*$/i);
    if(hit){ return (hit[1] || '').trim() }
  }
  return '';
};

H.quote = function(text){ return "'" + ('' + text).replace(/'/g, "'\"'\"'") + "'" };
H.psq = function(text){ return "'" + ('' + text).replace(/'/g, "''") + "'" };
H.b64 = function(text, raw, map, out, i, a, b, c, n){
  raw = text instanceof Uint8Array ? text : new TextEncoder().encode('' + text);
  map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; out = '';
  for(i = 0; i < raw.length; i += 3){
    a = raw[i]; b = raw[i + 1]; c = raw[i + 2]; n = (a << 16) | ((b || 0) << 8) | (c || 0);
    out += map[(n >> 18) & 63] + map[(n >> 12) & 63] + (null == b ? '=' : map[(n >> 6) & 63]) + (null == c ? '=' : map[n & 63]);
  }
  return out;
};
H.ps = function(line, cwd, id, safe, code){
  code = safe ? line : "$b=[ScriptBlock]::Create($e.GetString([Convert]::FromBase64String('" + H.b64(line) + "')));& $b";
  return "$e=[Text.Encoding]::UTF8;$c=0;$p=0;[Console]::Write(([char]30)+'AID" + id + "B'+([char]30)+[Environment]::NewLine);" +
    'try{' + (cwd ? 'Push-Location -LiteralPath ' + H.psq(cwd) + ';$p=1;' : '') +
    '$LASTEXITCODE=$null;$o=(& {' + code + '} 2>&1|Out-String);$ok=$?;' +
    'if($null -ne $LASTEXITCODE){$c=[int]$LASTEXITCODE}elseif(-not $ok){$c=1}}catch{$o=($_|Out-String);$c=1}finally{if($p){Pop-Location}};' +
    "$x=$e.GetBytes([string]$o);[Console]::Write(([BitConverter]::ToString($x)).Replace('-',' '));" +
    "[Console]::Write([Environment]::NewLine+([char]30)+'AID" + id + "E:'+$c+([char]30)+[Environment]::NewLine)";
};
H.wrap = function(line, cwd, id, safe, tmp, code){
  if('ps' === H.type){ return H.ps(line, cwd, id, safe) }
  code = safe ? line : "sh -c \"$(printf '%s' '" + H.b64(line) + "'|base64 -d)\"";
  tmp = 'tmp="${TMPDIR:-/tmp}/.aid' + id + '.$$"; ';
  return tmp + "printf '\\036AID" + id + "B\\036\\n'; { " +
    (cwd ? 'cd ' + H.quote(cwd) + ' && ' : '') + code + '; } >"$tmp" 2>&1; ' +
    "n=$?; od -An -v -tx1 \"$tmp\"; x=$?; rm -f \"$tmp\"; [ \"$x\" -eq 0 ] || n=$x; printf '\\n\\036AID" + id + "E:%s\\036\\n' \"$n\"";
};
H.hex = function(text, all, out, i){
  all = (text.match(/[0-9a-f]{2}/gi) || []); out = new Uint8Array(all.length);
  for(i = 0; i < all.length; i += 1){ out[i] = parseInt(all[i], 16) }
  return out;
};

H.take = function(raw, key, one, a, z, hit, bytes){
  if(!H.on){ return 0 }
  raw = '' + (raw && (raw.raw || raw.$) || raw || '');
  for(key in H.wait){
    one = H.wait[key]; one.raw += raw;
    a = one.raw.indexOf('\x1eAID' + key + 'B\x1e');
    z = one.raw.indexOf('\x1eAID' + key + 'E:', 0 <= a ? a : 0);
    if(0 > a || 0 > z){ continue }
    hit = one.raw.slice(z).match(/^\x1eAID[^:]+E:(\d+)\x1e/); if(!hit){ continue }
    bytes = H.hex(one.raw.slice(a + key.length + 6, z));
    clearTimeout(one.tick); delete H.wait[key];
    one.win({raw:bytes, out:new TextDecoder().decode(bytes), code:Number(hit[1]) || 0});
  }
  return 1;
};

H.stop = function(){ kit.say('\x03', 'host') };
H.claim = function(){ kit.say({mode:'shell'}, 'term.open') };
H.one = function(line, cwd, secs, safe, id, cmd){
  id = (++H.seq).toString(36) + Date.now().toString(36); cmd = H.wrap(line, cwd, id, safe);
  return new Promise(function(win, lose){
    H.wait[id] = {raw:'', win:win, lose:lose, tick:setTimeout(function(){
      if(!H.wait[id]){ return } delete H.wait[id]; H.stop(); lose(Error('host command timed out'));
    }, Math.max(1, Math.min(Number(secs) || 60, 120)) * 1000)};
    kit.say({'#':'aid.host.' + id, '$':cmd}, 'host');
  });
};
H.run = function(line, cwd, secs, safe){
  var go = function(){ return H.one(line, cwd, secs, safe) };
  H.line = H.line.then(go, go); return H.line;
};

H.load = function(){
  if(H.load.wait){ return H.load.wait }
  H.load.wait = new Promise(function(win, lose){
    var s = document.createElement('script'); s.src = './aid/aid.js'; s.onload = win; s.onerror = function(){ lose(Error('aid fallback failed to load')) };
    document.head.pin(s);
  });
  return H.load.wait;
};
H.open = async function(raw, ask, got, bit, cwd, home){
  if(H.on){ return } H.on = 1; H.type = H.kind(raw) || 'sh'; ask = H.ask(raw);
  H.claim();
  try{
    got = await H.run('ps' === H.type ? '"$((Get-Location).Path)$([char]0)$HOME"' : "printf '%s\\000%s' \"$PWD\" \"$HOME\"", '', 15);
    bit = got.out.split('\0'); cwd = (bit[0] || '/').trim(); home = (bit[1] || cwd).trim();
    if('ps' === H.type){ cwd = cwd.replace(/\\/g, '/'); home = home.replace(/\\/g, '/') }
    window.demo = {ok:0, id:'', cwd:cwd, home:home, root:0 === cwd.indexOf(home.replace(/\/$/, '') + '/') || cwd === home ? home : cwd,
      path:{up:function(path){ return path.replace(/\/?[^/]+\/?$/, '') || '/' }}};
    await H.load(); await Promise.all(aid.part.map(aid.one)); aid.store.root = home.replace(/\/$/, '') + '/.aid';
    await aid.role.load(); await aid.task(ask);
  }catch(e){
    if(window.aid && aid.fail){ aid.fail(e) }
    else if(window.AID){ AID.draw({kind:'fail', id:'hostfail', say:'aid: ' + (e.message || e)}) }
  }
};

kit.ear('term', function(eve){
  if(H.on){ H.take(eve.detail || eve.data || '') }
});
}(aid.host = aid.host || {}));

;(function(H){
H.hit = async function(path, got){
  got = await H.run('ps' === H.type ? '$p=' + H.psq(path) + ";if(Test-Path -LiteralPath $p -PathType Container){'directory'}elseif(Test-Path -LiteralPath $p){'file'}" :
    'if [ -d ' + H.quote(path) + " ]; then printf directory; elif [ -e " + H.quote(path) + ' ] || [ -L ' + H.quote(path) + ' ]; then printf file; fi');
  if(got.code){ throw Error(got.out || path + ': stat failed') } return got.out ? {kind:got.out.trim()} : null;
};
H.list = async function(path, got, bit, out, i){
  if('ps' === H.type){
    got = await H.run('Get-ChildItem -Force -LiteralPath ' + H.psq(path) + "|ForEach-Object{[PSCustomObject]@{kind=$(if($_.PSIsContainer){'directory'}else{'file'});name=$_.Name}}|ConvertTo-Json -Compress");
    try{ out = JSON.parse(got.out.trim() || '[]') }catch(e){ throw Error(got.out || path + ': list failed') }
    return Array.isArray(out) ? out : [out];
  }
  got = await H.run('p=' + H.quote(path) + '; for f in "$p"/* "$p"/.[!.]* "$p"/..?*; do [ -e "$f" ] || [ -L "$f" ] || continue; ' +
    'if [ -d "$f" ]; then k=directory; else k=file; fi; ' + "printf '%s\\000%s\\000' \"$k\" \"${f##*/}\"; done");
  bit = got.out.split('\0'); out = [];
  for(i = 0; i + 1 < bit.length; i += 2){ if(bit[i] && bit[i + 1]){ out.push({kind:bit[i], name:bit[i + 1]}) } }
  return out;
};
H.read = async function(path, got){
  if('ps' === H.type){
    got = await H.run('[BitConverter]::ToString([IO.File]::ReadAllBytes(' + H.psq(path) + ")).Replace('-',' ')");
    if(got.code){ throw Error(got.out || path + ': read failed') } return H.hex(got.out).buffer;
  }
  got = await H.run('cat -- ' + H.quote(path)); if(got.code){ throw Error(got.out || path + ': read failed') }
  return got.raw.buffer.slice(got.raw.byteOffset, got.raw.byteOffset + got.raw.byteLength);
};
H.put = async function(path, text, got, dir, raw, i, bit, line){
  dir = path.slice(0, path.lastIndexOf('/')) || '/'; raw = new TextEncoder().encode(null == text ? '' : '' + text);
  if('ps' === H.type){
    got = await H.run('[IO.Directory]::CreateDirectory(' + H.psq(dir) + ')|Out-Null;[IO.File]::WriteAllBytes(' + H.psq(path) + ',[byte[]]@())', '', 60, 1);
    if(got.code){ throw Error(got.out || path + ': write failed') }
    for(i = 0; i < raw.length; i += 192){
      bit = H.b64(raw.slice(i, i + 192)); line = "$f=[IO.File]::Open(" + H.psq(path) + ",[IO.FileMode]::Append);try{$b=[Convert]::FromBase64String('" + bit + "');$f.Write($b,0,$b.Length)}finally{$f.Dispose()}";
      got = await H.run(line, '', 60, 1); if(got.code){ throw Error(got.out || path + ': write failed') }
    }
    return;
  }
  got = await H.run('mkdir -p -- ' + H.quote(dir) + ' && : > ' + H.quote(path), '', 60, 1);
  if(got.code){ throw Error(got.out || path + ': write failed') }
  for(i = 0; i < raw.length; i += 384){
    line = "printf '%s' '" + H.b64(raw.slice(i, i + 384)) + "'|base64 -d >> " + H.quote(path);
    got = await H.run(line, '', 60, 1); if(got.code){ throw Error(got.out || path + ': write failed') }
  }
};
H.drop = async function(path, got){
  got = await H.run('ps' === H.type ? 'Remove-Item -LiteralPath ' + H.psq(path) + ' -Recurse -Force' : 'rm -rf -- ' + H.quote(path));
  if(got.code){ throw Error(got.out || path + ': remove failed') }
};
}(aid.host));

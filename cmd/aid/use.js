// use — agent tools over the OPFS and the virtual shell
// every path resolves through demo.path.abs so cd stays shared

;(function(){
var CAP = 4000;
aid.cap = function(text, size){
  text = '' + (text || '');
  return text.length > size ? text.slice(0, size) + '\n...(cut)' : text;
};
aid.use = {};
// file body or folder listing
aid.use.read = async function(tool){
  var abs = demo.path.abs(tool.path || '.'), hit = await demo.opfs.exists(abs);
  if(!hit){ return abs + ': no such file' }
  if('directory' === hit.kind){
    var list = await demo.opfs.list(abs);
    return list.map(function(n){ return 'directory' === n.kind ? n.name + '/' : n.name }).join('\n') || '(empty)';
  }
  try{ return aid.cap(await demo.opfs.readText(abs), CAP) }
  catch(e){ return abs + ': not text' }
};
// word search down a folder, deepest four levels
aid.use.find = async function(tool){
  var word = ('' + (tool.word || '')).toLowerCase(), out = [], most = 60;
  var walk = async function(path, deep){
    var all, i, name, abs, text, at;
    if(out.length >= most || deep > 4){ return }
    all = await demo.opfs.list(path);
    for(i = 0; i < all.length; i++){
      name = all[i].name;
      if('node_modules' === name || '.git' === name){ continue }
      abs = path + '/' + name;
      if('directory' === all[i].kind){ await walk(abs, deep + 1); continue }
      try{ text = (await demo.opfs.readText(abs)).toLowerCase() }catch(e){ continue }
      at = text.indexOf(word);
      if(0 > at){ continue }
      out.push(abs + ':' + text.slice(0, at).split('\n').length);
      if(out.length >= most){ return }
    }
  };
  if(!word){ return 'find needs word' }
  await walk(demo.path.abs(tool.path || '.'), 0);
  return out.join('\n') || 'no hit';
};
// whole new file body
aid.use.save = async function(tool){
  if(!tool.path){ return 'save needs path' }
  var abs = demo.path.abs(tool.path), body = '' + (tool.text || '');
  await demo.opfs.write(abs, body);
  return 'saved ' + abs + ' ' + body.length + ' bytes';
};
// one line on the virtual shell, same disk and cwd as the user
aid.use.sh = async function(tool){
  var out = await demo.cmd.run(('' + (tool.line || '')).trim());
  return aid.cap(out, 3000) || '(no output)';
};
}());

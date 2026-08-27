// Exact write and edit tools; each mutation is journaled.

;(function(){
aid.use = aid.use || {};
aid.use.write = async function(arg, run){
  if(!arg.path){ return 'write needs path' }
  var path = aid.disk.abs(arg.path, run), text = '' + (null == arg.text ? '' : arg.text);
  var before = await aid.disk.write(run, path, text);
  return 'wrote ' + path + ' · ' + text.length + ' bytes\n' + aid.diff.make(before, text, path);
};
aid.use.edit = async function(arg, run){
  if(!arg.path || null == arg.old){ return 'edit needs path and old' }
  var path = aid.disk.abs(arg.path, run), before = await aid.disk.text(path), old = '' + arg.old;
  var text = '' + (null == arg.text ? '' : arg.text), after;
  if(!old || 0 > before.indexOf(old)){ return 'old text not found in ' + path }
  after = arg.all ? before.split(old).join(text) : before.replace(old, text);
  await aid.disk.write(run, path, after);
  return 'edited ' + path + '\n' + aid.diff.make(before, after, path);
};
aid.use.save = aid.use.write;
}());

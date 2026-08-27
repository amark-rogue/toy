// Native tool schema and one guarded execution path.

;(function(){
var fn = function(name, desc, prop, need){
  return {type:'function', function:{name:name, description:desc, parameters:{type:'object', properties:prop || {}, required:need || [], additionalProperties:false}}};
};
aid.tool = aid.tool || {};
aid.tool.def = [
  fn('read', 'Read a text file with line numbers, or list a folder.', {path:{type:'string'}, line:{type:'number'}, count:{type:'number'}}),
  fn('tree', 'List a project tree.', {path:{type:'string'}, deep:{type:'number'}}),
  fn('find', 'Find text in project files.', {word:{type:'string'}, path:{type:'string'}}, ['word']),
  fn('write', 'Create or fully replace one text file.', {path:{type:'string'}, text:{type:'string'}}, ['path','text']),
  fn('edit', 'Replace exact text in one file.', {path:{type:'string'}, old:{type:'string'}, text:{type:'string'}, all:{type:'boolean'}}, ['path','old','text']),
  fn('sh', 'Run a shell command in the working folder.', {line:{type:'string'}, secs:{type:'number'}}, ['line']),
  fn('diff', 'Show all changes made in this session.', {}),
  fn('plan', 'Publish a short task plan.', {steps:{type:'array', items:{type:'string'}}}, ['steps']),
  fn('ask', 'Ask the user for missing information or a choice.', {say:{type:'string'}, pick:{type:'array', items:{type:'string'}}}, ['say']),
  fn('memo', 'Read or manage explicit durable user facts. Add only facts the user explicitly asks to remember or clearly states as lasting preferences; never infer or store secrets.', {op:{type:'string', enum:['list','add','find','drop']}, text:{type:'string'}, word:{type:'string'}, id:{type:'string'}}, ['op']),
  fn('todo', 'Read or manage durable commitments and follow-ups.', {op:{type:'string', enum:['list','add','set','done','drop']}, id:{type:'string'}, text:{type:'string'}, state:{type:'string', enum:['todo','doing','done']}, due:{type:'string'}, all:{type:'boolean'}}, ['op']),
  fn('past', 'Search prior local aid sessions for relevant context.', {word:{type:'string'}, count:{type:'number'}}),
  fn('web', 'Retrieve one public HTTP or HTTPS page. Use exact URLs and use word to narrow a long page.', {url:{type:'string'}, word:{type:'string'}, secs:{type:'number'}}, ['url']),
  fn('role', 'List, create, select, or remove user-made roles. Create one only when the user asks for a reusable role or persona.', {op:{type:'string', enum:['list','save','set','drop']}, id:{type:'string'}, name:{type:'string'}, text:{type:'string'}, pick:{type:'boolean'}}, ['op']),
  fn('task', 'Delegate one bounded multi-step job to a child agent. Use plan unless edits are truly needed; do not delegate a simple read or search.', {ask:{type:'string'}, role:{type:'string'}, mode:{type:'string', enum:['plan','work']}}, ['ask'])
];
aid.tool.test = function(call){
  var one = aid.tool.get(call.name), set, args = call.args, keys, i, j, key, val, kind;
  if(!one){ return 'unknown tool "' + (call.name || '') + '"' }
  set = one.parameters || {}; args = args || {};
  if('object' !== typeof args || Array.isArray(args)){ return call.name + ' arguments must be one object' }
  for(i = 0; i < (set.required || []).length; i++){
    key = set.required[i]; if(!Object.prototype.hasOwnProperty.call(args, key)){ return call.name + ' needs "' + key + '"' }
  }
  keys = Object.keys(args);
  for(i = 0; i < keys.length; i++){
    key = keys[i]; val = args[key]; kind = (set.properties[key] || {}).type;
    if(!set.properties[key]){ return call.name + ' does not accept "' + key + '"' }
    if('array' === kind && !Array.isArray(val)){ return call.name + '.' + key + ' must be an array' }
    if('array' !== kind && kind && typeof val !== kind){ return call.name + '.' + key + ' must be ' + kind }
    if('number' === kind && !isFinite(val)){ return call.name + '.' + key + ' must be finite' }
    if('array' === kind && set.properties[key].items){
      for(j = 0; j < val.length; j++){
        if(typeof val[j] !== set.properties[key].items.type){ return call.name + '.' + key + ' items must be ' + set.properties[key].items.type }
      }
    }
    if(set.properties[key].enum && -1 === set.properties[key].enum.indexOf(val)){ return call.name + '.' + key + ' is not allowed' }
  }
  return '';
};
aid.tool.help = function(){
  var list = aid.tool.def.map(function(one){
    var fn = one.function, set = fn.parameters || {}, need = set.required || [];
    return fn.name + '(' + Object.keys(set.properties || {}).map(function(key){ return (-1 < need.indexOf(key) ? '' : '?') + key }).join(',') + ')';
  });
  return [
    'When native tools are unavailable, reply with only one canonical Markdown block:',
    '```tool',
    '{"tool":"name","args":{"argument":"value"}}',
    '```',
    'Use exactly one declared tool and one args object. Required arguments have no ? mark: ' + list.join(' · '),
    'After its result, call another tool or give the final answer in Markdown.'
  ].join('\n');
};
aid.tool.fail = function(text){
  return text + '\nThe requested action did not happen. Do not treat unavailable data as observed; retry with grounded arguments, use another tool, or report the blocker.';
};
aid.tool.run = async function(run, call){
  call = aid.tool.one(call); call.id = call.id || run.id + 'c' + (++run.call);
  var use = aid.use[call.name], ok, got, bad = call.bad || aid.tool.test(call), sig = call.name + ':' + JSON.stringify(call.args || {});
  if(bad){ return {id:call.id, name:call.name, content:aid.tool.fail('invalid tool call: ' + bad), bad:1} }
  run.loop = run.loop || {}; run.loop[sig] = (run.loop[sig] || 0) + 1;
  if(3 < run.loop[sig]){ return {id:call.id, name:call.name, content:aid.tool.fail('blocked repeated identical tool call'), bad:1} }
  if(!use){ return {id:call.id, name:call.name, content:aid.tool.fail('unknown tool: ' + call.name), bad:1} }
  ok = await aid.ask.perm(run, call);
  if(!ok){
    aid.emit(run, 'tool', {id:call.id, name:call.name, say:'denied', done:1, bad:1});
    return {id:call.id, name:call.name, content:aid.tool.fail('denied by user'), bad:1};
  }
  aid.emit(run, 'tool', {id:call.id, name:call.name, say:aid.cap(JSON.stringify(call.args || {}), 1200)});
  try{
    got = aid.cap(await use(call.args || {}, run, call), 30000);
    aid.emit(run, 'tool', {id:call.id, name:call.name, say:aid.cap(got, 4000), done:1});
  }catch(e){
    bad = 1; got = aid.tool.fail('error: ' + (e.message || e)); aid.emit(run, 'tool', {id:call.id, name:call.name, say:got, done:1, bad:1});
  }
  return {id:call.id, name:call.name, content:got, bad:bad ? 1 : 0};
};
}());

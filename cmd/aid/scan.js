// Text tool fallback for providers without native calls.

;(function(){
aid.tool = aid.tool || {};
aid.tool.get = function(name){
  var all = aid.tool.def || [], i;
  for(i = 0; i < all.length; i++){ if(name === all[i].function.name){ return all[i].function } }
};
aid.tool.is = function(name){ return !!aid.tool.get(name) };
aid.tool.arg = function(name){
  var one = aid.tool.get(name), p = one && one.parameters || {};
  return (p.required || [])[0] || Object.keys(p.properties || {})[0] || '';
};
aid.tool.can = function(name, key){
  var one = aid.tool.get(name), all = one && one.parameters.properties || {};
  return Object.prototype.hasOwnProperty.call(all, key);
};
aid.tool.key = function(val){
  var keys, name, raw, out = {}, arg, i, j, ok, one;
  if(!val || 'object' !== typeof val){ return null }
  if(Array.isArray(val)){
    out.calls = [];
    for(i = 0; i < val.length; i++){ out.calls.push(aid.tool.key(val[i]) || {}) }
    return val.length ? out : null;
  }
  if(val.tool || val.name && aid.tool.is(val.name)){ return val }
  if(Array.isArray(val.calls)){
    out.calls = [];
    for(i = 0; i < val.calls.length; i++){
      one = aid.tool.key(val.calls[i]);
      if(one){ out.calls.push(one) } else { out.calls.push({}) }
    }
    return val.calls.length ? out : null;
  }
  keys = Object.keys(val); name = '';
  for(i = 0; i < keys.length; i++){
    if(!aid.tool.is(keys[i])){ continue }
    ok = 1;
    for(j = 0; j < keys.length; j++){
      if(i !== j && !aid.tool.can(keys[i], keys[j])){ ok = 0; break }
    }
    if(ok){ if(name){ return null } name = keys[i] }
  }
  if(!name){ return null }
  out.tool = name; raw = val[name];
  if(raw && 'object' === typeof raw && !Array.isArray(raw)){
    Object.keys(raw).forEach(function(key){ out[key] = raw[key] });
  } else if(true !== raw && null != raw){
    arg = aid.tool.arg(name); if(arg){ out[arg] = raw }
  }
  for(i = 0; i < keys.length; i++){ if(name !== keys[i]){ out[keys[i]] = val[keys[i]] } }
  return out;
};
aid.tool.read = function(text, at){
  var stack = [], quote = '', i, c;
  for(i = at; i < text.length; i++){
    c = text.charAt(i);
    if(quote){ if('\\' === c){ i += 1 } else if(quote === c){ quote = '' } continue }
    if('"' === c){ quote = c; continue }
    if('{' === c){ stack.push('}') }
    else if('[' === c){ stack.push(']') }
    else if(c === stack[stack.length - 1]){ stack.pop(); if(!stack.length){ return {at:at, end:i + 1, raw:text.slice(at, i + 1)} } }
  }
};
aid.tool.json = function(text){
  text = '' + (text || ''); aid.note = '';
  var fence = /```(?:tool|json)\b/gi, hit, box, val, mark, at = 0;
  while((hit = fence.exec(text))){
    mark = text.slice(fence.lastIndex).search(/\S/); if(0 > mark){ continue }
    box = aid.tool.read(text, fence.lastIndex + mark); if(!box){ continue }
    try{ val = aid.tool.key(JSON.parse(box.raw)) }catch(e){ val = null }
    if(val){ aid.note = text.slice(0, hit.index).trim(); return val }
  }
  while(0 <= (at = text.indexOf('{', at))){
    box = aid.tool.read(text, at); if(!box){ break }
    try{ val = aid.tool.key(JSON.parse(box.raw)) }catch(e){ val = null }
    if(val){
      aid.note = text.slice(0, at).replace(/```(?:tool|json)?\s*$/i, '').trim(); return val;
    }
    at = box.end;
  }
  return null;
};
}());

;(function(){
aid.scan = function(text){
  var val = aid.tool.json(text); return !val ? null : val.tool ? val : val.calls && val.calls[0] || null;
};
aid.tool.args = function(raw){
  var val;
  if(null == raw || '' === raw){ return {} }
  if('object' === typeof raw && !Array.isArray(raw)){ return raw }
  if('string' !== typeof raw){ return null }
  try{ val = JSON.parse(raw) }catch(e){ return null }
  return val && 'object' === typeof val && !Array.isArray(val) ? val : null;
};
aid.tool.one = function(raw){
  raw = raw || {}; var own = Object.prototype.hasOwnProperty, body = raw, name = '', id = '', val, args, key, out;
  if(raw.functionCall){ body = raw.functionCall }
  else if(raw.function_call && 'object' === typeof raw.function_call){ body = raw.function_call }
  else if(raw.toolUse){ body = raw.toolUse }
  else if(raw.function && 'object' === typeof raw.function){ body = raw.function }
  else if(raw.call && 'object' === typeof raw.call){ body = raw.call }
  name = body.tool || body.name || body.toolName || raw.tool || raw.name || raw.toolName || '';
  id = raw.call_id || raw.tool_call_id || raw.toolCallId || raw.toolUseId || body.toolUseId || (body !== raw || own.call(raw, 'args') || own.call(raw, 'arguments') || own.call(raw, 'input') || own.call(raw, 'parameters') ? raw.id || '' : '');
  if(own.call(body, 'args')){ val = body.args }
  else if(own.call(body, 'arguments')){ val = body.arguments }
  else if(own.call(body, 'input')){ val = body.input }
  else if(own.call(body, 'parameters')){ val = body.parameters }
  if(undefined !== val){ args = aid.tool.args(val) }
  else {
    args = {};
    for(key in body){
      if('tool' === key || !body.tool && /^(?:name|id|type|call_id|toolName|toolCallId)$/.test(key)){ continue }
      args[key] = body[key];
    }
  }
  out = {id:id, name:name, args:args || {}};
  if(null === args){ out.bad = 'arguments must be one JSON object' }
  if(!out.bad && aid.tool.test){ out.bad = aid.tool.test(out) || undefined }
  if(!out.bad){ delete out.bad }
  return out;
};
aid.tool.take = function(text){
  var val = aid.tool.json(text), all, out = [];
  if(!val){ return out } all = val.calls || [val];
  all.forEach(function(one){ out.push(aid.tool.one(one)) }); return out;
};
aid.tool.miss = function(text){
  text = '' + (text || ''); var hit = text.match(/\{\s*["']?([a-z]+)["']?\s*:/i);
  return /```tool\b/i.test(text) || /\{[\s\S]{0,400}["']?(?:tool|calls)["']?\s*:/i.test(text)
    || !!(hit && aid.tool.is(hit[1])) || /<tool(?:_call|use)\b/i.test(text);
};
aid.tool.fix = function(text, calls){
  var why = (calls || []).map(function(one){ return one.bad }).filter(Boolean).join('; ');
  return 'Your previous response looked like a tool request but was invalid, so no tool ran. '
    + 'Reply with exactly one valid fenced tool block. Quote every property name and include every required argument.'
    + (why ? '\nProblem: ' + why : '') + '\n' + aid.tool.help() + '\nInvalid response:\n' + aid.cap(text, 2000);
};
}());

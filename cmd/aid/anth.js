// Anthropic request shape.

;(function(){
aid.net = aid.net || {};
aid.net.api = aid.net.api || {};
aid.net.anth = function(msg){
  var out = [], sys = [], last, i, one, body;
  for(i = 0; i < msg.length; i++){
    one = msg[i];
    if('system' === one.role){ sys.push(one.content || ''); continue }
    if('assistant' === one.role){
      body = []; if(one.content){ body.push({type:'text', text:one.content}) }
      (one.calls || []).forEach(function(call){ body.push({type:'tool_use', id:call.id, name:call.name, input:call.args || {}}) });
      out.push({role:'assistant', content:body.length ? body : [{type:'text', text:''}]}); continue;
    }
    if('tool' === one.role){
      last = out[out.length - 1]; body = {type:'tool_result', tool_use_id:one.id, content:one.content || ''};
      if(last && 'user' === last.role && Array.isArray(last.content) && last.aid){ last.content.push(body) }
      else { out.push({role:'user', content:[body], aid:1}) }
      continue;
    }
    out.push({role:'user', content:one.content || ''});
  }
  out.forEach(function(one){ delete one.aid }); return {system:sys.join('\n\n'), messages:out};
};
aid.net.api.anth = {body:function(name, msg, live, plain){
  var row = aid.row(name), got = aid.net.anth(msg), body = {model:aid.model(name), max_tokens:4096, messages:got.messages};
  if(got.system){ body.system = got.system }
  if(row.tool && aid.tool){ body.tools = aid.tool.def.map(function(one){ return {
    name:one.function.name, description:one.function.description, input_schema:one.function.parameters
  } }) }
  if(live){ body.stream = true }
  return body;
}};
}());

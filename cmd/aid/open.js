// OpenAI-compatible request shape.

;(function(){
aid.net = aid.net || {};
aid.net.api = aid.net.api || {};
aid.net.open = function(msg){
  return msg.map(function(one){
    var out = {role:one.role, content:one.content || ''};
    if('assistant' === one.role && one.calls){
      out.content = one.content || null;
      out.tool_calls = one.calls.map(function(call){
        return {id:call.id, type:'function', function:{name:call.name, arguments:JSON.stringify(call.args || {})}};
      });
    }
    if('tool' === one.role){ out = {role:'tool', tool_call_id:one.id, content:one.content || ''} }
    return out;
  });
};
aid.net.flat = function(msg){
  return msg.map(function(one){
    if('assistant' === one.role && one.calls){
      var calls = one.calls.map(function(call){
        return {tool:call.name, args:call.args || {}};
      });
      return {role:'assistant', content:(one.content ? one.content + '\n' : '') + '```tool\n' + JSON.stringify(1 === calls.length ? calls[0] : {calls:calls}) + '\n```'};
    }
    if('tool' === one.role){ return {role:'user', content:'Tool ' + one.name + ' result:\n' + (one.content || '')} }
    return {role:one.role, content:one.content || ''};
  });
};
aid.net.api.open = {body:function(name, msg, live, plain){
  var row = aid.row(name), tool = row.tool && !plain, body = {messages:tool ? aid.net.open(msg) : aid.net.flat(msg)};
  if(aid.model(name)){ body.model = aid.model(name) }
  if(tool && aid.tool){ body.tools = aid.tool.def; body.tool_choice = 'auto' }
  if(live){ body.stream = true }
  return body;
}};
}());

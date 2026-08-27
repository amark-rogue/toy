// Every backend response becomes one internal text/calls/use turn.

;(function(){
aid.net = aid.net || {};
aid.net.use = function(obj){
  var raw = obj.usage || obj.usageMetadata || {}, out = {}, key;
  for(key in raw){ out[key] = raw[key] }
  out.prompt_tokens = Number(raw.prompt_tokens || raw.input_tokens || raw.inputTokens || raw.promptTokenCount || raw.prompt_eval_count || obj.prompt_eval_count || 0);
  out.completion_tokens = Number(raw.completion_tokens || raw.output_tokens || raw.outputTokens || raw.candidatesTokenCount || raw.eval_count || obj.eval_count || 0);
  out.total_tokens = Number(raw.total_tokens || raw.totalTokens || raw.totalTokenCount || out.prompt_tokens + out.completion_tokens || 0);
  return out;
};
aid.net.put = function(out, one){
  var i;
  if(null == one){ return }
  if(Array.isArray(one)){ for(i = 0; i < one.length; i++){ aid.net.put(out, one[i]) } return }
  if('string' === typeof one){ out.text += one; return }
  if(/^(?:function_call|custom_tool_call|tool_use|tool_call)$/.test(one.type || '')){ out.calls.push(aid.tool.one(one)); return }
  if(one.functionCall || one.function_call || one.toolUse){ out.calls.push(aid.tool.one(one)) }
  (one.tool_calls || one.toolCalls || one.calls || []).forEach(function(call){ out.calls.push(aid.tool.one(call)) });
  if(one.message){ aid.net.put(out, one.message); return }
  if(one.parts){ aid.net.put(out, one.parts); return }
  if(Array.isArray(one.content)){ aid.net.put(out, one.content); return }
  if('string' === typeof one.content){ out.text += one.content; return }
  if('string' === typeof one.output_text){ out.text += one.output_text; return }
  if('string' === typeof one.text && !/^(?:input_text|reasoning)$/.test(one.type || '')){ out.text += one.text; return }
  if('string' === typeof one.response){ out.text += one.response }
};
aid.net.norm = function(got, obj){
  if('string' === typeof got){ got = {text:got} } got = got || {};
  return {text:got.text || '', calls:(got.calls || []).map(aid.tool.one), use:got.use || aid.net.use(obj || got)};
};
aid.net.turn = function(obj, make){
  if(obj && obj.error){ throw Error((obj.error || {}).message || obj.error) }
  obj = obj || {}; var api = aid.net.api && aid.net.api[make], got, out = {text:'', calls:[], use:aid.net.use(obj)}, pick;
  if(api && api.turn){ got = api.turn(obj); return aid.net.norm(got, obj) }
  if(obj.choices && obj.choices.length){ pick = obj.choices[0]; aid.net.put(out, pick.message || pick.delta || pick.text || '') }
  else if(obj.output){ aid.net.put(out, obj.output) }
  else if(obj.candidates && obj.candidates.length){ aid.net.put(out, obj.candidates[0].content || obj.candidates[0]) }
  else if(obj.message){ aid.net.put(out, obj.message) }
  else { aid.net.put(out, obj) }
  return aid.net.norm(out, obj);
};
}());

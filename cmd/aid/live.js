// Chunked OpenAI, Responses, Anthropic, Gemini and Ollama turns.

;(function(){
aid.net.say = function(out, text, on){
  text = text || ''; if(!text){ return } out.text += text; on(text, out);
};
aid.net.slot = function(out, at, key){
  out.map = out.map || {};
  if(key && null != out.map[key]){ at = out.map[key] }
  if(null == at){ at = out.calls.length }
  if(key){ out.map[key] = at }
  return out.calls[at] || (out.calls[at] = {id:'', name:'', raw:''});
};
aid.net.live = function(out, obj, type, on, make){
  if(obj.error){ throw Error((obj.error || {}).message || obj.error) }
  var api = aid.net.api && aid.net.api[make];
  if(api && api.live){ api.live(out, obj, type, on); return }
  type = type || obj.type || ''; var pick, d, part, call, at, tc, was = out.text.length;
  if(obj.choices && obj.choices.length){
    pick = obj.choices[0]; d = pick.delta || pick.message || {};
    if('string' === typeof d.content){ aid.net.say(out, d.content, on) }
    (d.tool_calls || []).forEach(function(one){
      at = null == one.index ? null : one.index; tc = aid.net.slot(out, at, one.id);
      if(one.id){ tc.id = one.id } if(one.function){ tc.name += one.function.name || ''; tc.raw += one.function.arguments || '' }
    });
    if(d.function_call){ tc = aid.net.slot(out, 0); tc.name += d.function_call.name || ''; tc.raw += d.function_call.arguments || '' }
  } else if(/^response\./.test(type)){
    if('response.output_text.delta' === type){ aid.net.say(out, obj.delta, on) }
    if('response.output_item.added' === type && obj.item && 'function_call' === obj.item.type){
      call = obj.item; tc = aid.net.slot(out, obj.output_index, call.id || call.call_id); tc.id = call.call_id || call.id || ''; tc.name = call.name || ''; tc.raw = call.arguments || '';
    }
    if('response.function_call_arguments.delta' === type){ tc = aid.net.slot(out, obj.output_index, obj.item_id); tc.raw += obj.delta || '' }
    if('response.function_call_arguments.done' === type){ tc = aid.net.slot(out, obj.output_index, obj.item_id); if(!tc.raw){ tc.raw = obj.arguments || '' } }
  } else if('content_block_start' === type && 'tool_use' === (obj.content_block || {}).type){
    part = obj.content_block; tc = aid.net.slot(out, obj.index, part.id); tc.id = part.id || ''; tc.name = part.name || ''; tc.raw = part.input && Object.keys(part.input).length ? JSON.stringify(part.input) : '';
  } else if('content_block_delta' === type){
    d = obj.delta || {};
    if('text_delta' === d.type){ aid.net.say(out, d.text, on) }
    if('input_json_delta' === d.type){ aid.net.slot(out, obj.index).raw += d.partial_json || '' }
  } else {
    aid.net.put(out, obj.message || (obj.candidates && obj.candidates[0] && obj.candidates[0].content) || obj);
    if(out.text.length > was){ on(out.text.slice(was), out) }
  }
  if(obj.usage || obj.usageMetadata){ out.use = aid.net.use(obj) }
  if(obj.message && obj.message.usage){ out.use = aid.net.use(obj.message) }
};
aid.net.done = function(out){
  out.calls = out.calls.filter(Boolean).map(function(one, i){
    var call = Object.prototype.hasOwnProperty.call(one, 'raw') ? {id:one.id || 'call' + i, name:one.name || '', arguments:one.raw} : one;
    return aid.tool.one(call);
  });
  delete out.map; return out;
};
}());

// Schema-derived tool calls for transport tests.

const val = function(set, key, n){
  if(set.enum){ return set.enum[n % set.enum.length] }
  if('string' === set.type){ return 'v' + n + ':' + key + ' "}\n``` tool-like text λ' }
  if('number' === set.type){ return n + 0.25 }
  if('boolean' === set.type){ return 0 === n % 2 }
  if('array' === set.type){ return [val(set.items || {type:'string'}, key, n)] }
  return {};
};

exports.make = function(def, n){
  var fn = def.function, prop = fn.parameters.properties || {}, args = {};
  Object.keys(prop).forEach(function(key, i){ args[key] = val(prop[key], key, n + i) });
  return {id:'c' + n, name:fn.name, args:args};
};

exports.mix = function(obj, n){
  var out = {}, keys = Object.keys(obj), at = n % (keys.length || 1);
  keys.slice(at).concat(keys.slice(0, at)).reverse().forEach(function(key){ out[key] = obj[key] });
  return out;
};

exports.same = function(call){ return {id:call.id, name:call.name, args:call.args} };

// demo cmd: printf FORMAT [args]  (%s, %d, %%, \n \t \\)
demo.cmd.printf = async function(args){
  if(!args.length) return 'printf: missing operand\n';
  var fmt = args[0], rest = args.slice(1), i = 0, out = '';
  var esc = function(s){ return s.replace(/\\(n|t|\\)/g, function(m, c){ return 'n' === c ? '\n' : 't' === c ? '\t' : '\\' }) };
  do {
    out += esc(fmt).replace(/%([sd%])/g, function(m, c){ return '%' === c ? '%' : (rest[i++] || '') });
  } while(i < rest.length);
  return out;
};

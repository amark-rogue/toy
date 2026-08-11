demo.cmd.open = async function(args){
  var file = args[0];
  if(!file) return 'open: missing file\n';
  if(/^(?:(?:localhost|127\.0\.0\.1):)?\d+(?:\/.*)?$/.test(file)) return '';
  var path = demo.path.abs(file);
  var hit = await demo.opfs.exists(path);
  if(!hit) return 'open: ' + path + ': No such file\n';
  if('file' !== hit.kind) return 'open: ' + path + ': Is a directory\n';
  return '';
};

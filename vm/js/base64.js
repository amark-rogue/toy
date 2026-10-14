// demo cmd: base64 [-d] [file]  (reads piped input when no file)
demo.cmd.base64 = async function(args, line, input){
  var f = demo.flag(args), text = input || '';
  try{
    if(f.rest[0]) text = await demo.opfs.readText(f.rest[0]);
    if(/d|D/.test(f.flags)){
      var bin = atob(text.replace(/\s+/g, '')), buf = new Uint8Array(bin.length), i;
      for(i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(buf);
    }
    var raw = new TextEncoder().encode(text), s = '', j;
    for(j = 0; j < raw.length; j++) s += String.fromCharCode(raw[j]);
    return btoa(s).replace(/(.{76})/g, '$1\n') + '\n';
  }catch(e){
    return 'base64: invalid input\n';
  }
};

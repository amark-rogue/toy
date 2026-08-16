// demo cmd: help
demo.cmd.help = async function(){
  return [
    'demo shell — instant OPFS commands + a richer browser shell',
    '  ls cd pwd cat touch mkdir rm cp echo clear help',
    '  pipes, redirects, globbing, shell scripts and common POSIX tools',
    '  node <file> / node -e <code> / TypeScript',
    '  npm, npx, pnpm, yarn, bun and git',
    '  open <file|port>    (preview a file or browser Node server)',
    '  the richer shell loads automatically when one of these needs it',
    '  pip install / apk   (stubs)',
    ''
  ].join('\n');
};

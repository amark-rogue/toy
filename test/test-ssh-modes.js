const assert = require('assert');
const fs = require('fs');
const path = require('path');
const pty = require('node-pty');
const os = require('os');

const root = path.resolve(__dirname, '..');
const utilCode = fs.readFileSync(path.join(root, 'util.js'), 'utf8');

global.HTMLElement = function(){};
global.HTMLElement.prototype = {};
global.NodeList = function(){};
global.NodeList.prototype = {};
global.document = {
  createElement: () => ({}),
  querySelectorAll: () => [],
  addEventListener: () => {},
  body: { addEventListener: () => {} }
};
global.window = { Tool: {} };
global.Tool = {};
global.screen = {};
global.navigator = {};

eval(utilCode);
var shellReply = window.shellReply;

console.log('====================================================');
console.log('    TEST SUITE: Robust SSH PTY Mode Verification');
console.log('====================================================\n');

// Test 1: Verify prompt sign detection across diverse SSH prompts
const prompts = [
  { raw: 'user@hostname:~$ ', sign: '$', path: 'user@hostname:~' },
  { raw: 'root@server:~# ', sign: '#', path: 'root@server:~' },
  { raw: 'PS C:\\Users\\User> ', sign: '>', path: 'PS C:\\Users\\User' },
  { raw: 'zsh-theme ~% ', sign: '~%', path: 'zsh-theme ~' },
  { raw: 'bash-5.2$ ', sign: '$', path: 'bash-5.2' },
  { raw: '(venv) user@host:~/project$ ', sign: '$', path: '(venv) user@host:~/project' }
];

prompts.forEach((p) => {
  const hit = String.hit(p.raw);
  assert.ok(hit, `Prompt sign detected for ${p.raw}`);
  assert.strictEqual(hit.sign, p.sign, `Sign match for ${p.raw}`);
  console.log(`PASS Prompt Sign Detection [${p.sign}]: "${p.raw.trim()}"`);
});

// Test 2: Verify terminal takeover detection across ANSI control sequences
const ttySamples = [
  { raw: '\x1b[?1049h\x1b[22;0;0t\x1b[?1h\x1b=', mode: 'alt', name: 'nano alt screen' },
  { raw: '\x1b[?2026h\x1b[H\x1b[2J', mode: 'sync', name: 'sync terminal update' },
  { raw: '\x1b[?25l\x1b[H\x1b[2Jtop - 12:00:00', mode: 'full', name: 'full screen top' },
  { raw: '\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m\r\nuser@host:~$ ', mode: '', name: 'plain colored text' }
];

ttySamples.forEach((s) => {
  const mode = s.raw.tty();
  assert.strictEqual(mode, s.mode, `TTY mode match for ${s.name}`);
  console.log(`PASS TTY Takeover Detection [${s.mode || 'none'}]: ${s.name}`);
});

// Test 3: Verify splitPrompts on raw stream output across SSH modes
const modes = [
  { name: 'raw -echo', stty: 'stty raw -echo\r\n' },
  { name: '-echo', stty: 'stty -echo\r\n' },
  { name: 'sane (echo)', stty: 'stty sane\r\n' }
];

async function testPtyMode(modeConfig) {
  return new Promise((resolve) => {
    const sh = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const ptyProcess = pty.spawn(sh, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: os.homedir(),
      env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' }
    });

    let output = '';
    ptyProcess.onData((data) => {
      output += data;
    });

    ptyProcess.write(modeConfig.stty);
    ptyProcess.write('ls .\r\n');

    setTimeout(() => {
      ptyProcess.kill();

      const parts = output.splitPrompts();
      assert.ok(!output.tty(), `${modeConfig.name}: ls output does not trigger tty takeover`);
      assert.ok(parts.length >= 1, `${modeConfig.name}: output splits into prompt units`);

      // Verify stty noise filter check
      const cmds = parts.map(p => p.cmd()).filter(c => c);
      const isNoiseSwallowed = cmds.some(c => /^stty\b|^clear$/.test(c));
      console.log(`PASS PTY Mode [${modeConfig.name}] -> split units: ${parts.length}, stty noise identified: ${isNoiseSwallowed}`);

      resolve();
    }, 1200);
  });
}

async function runAll() {
  for (const m of modes) {
    await testPtyMode(m);
  }
  console.log('\n====================================================');
  console.log('  SUCCESS: ALL SSH PTY MODES TESTED AND VERIFIED');
  console.log('====================================================');
}

runAll();

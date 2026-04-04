var sdk = require('@anthropic-ai/claude-agent-sdk');

module.exports = function(c, json, dir){
  console.log('[claude] start:', json.prompt, 'session:', json.session||'new', 'cwd:', json.cwd||dir);
  var opts = {};
  if(json.session) opts.resume = json.session;
  opts.includePartialMessages = true;
  opts.cwd = json.cwd || dir || process.cwd();
  var savedKey = process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_API_KEY;
  var q = sdk.query({prompt: json.prompt, options: opts});
  c.claudeQuery = q;
  var sid = json.session || null;
  (async function(){
    for await (var msg of q){
      if(msg.type === 'system' && msg.subtype === 'init' && msg.session_id){
        sid = msg.session_id;
        console.log('[claude] session:', sid);
      }
      console.log('[claude] event:', msg.type || 'unknown');
      c.send(JSON.stringify({type:'claude-event', data: msg}));
    }
  })().catch(function(e){
    console.log('[claude] error:', e.message);
    c.send(JSON.stringify({type:'claude-event',data:{type:'error',text:e.message}}));
  }).finally(function(){
    console.log('[claude] done, session:', sid);
    if(savedKey) process.env.ANTHROPIC_API_KEY = savedKey;
    c.claudeQuery = null;
    c.send(JSON.stringify({type:'claude-done', sessionId:sid}));
  });
};

module.exports.check = function(c){
  var home = require('os').homedir(), fs = require('fs'), path = require('path');
  var ok = !!process.env.ANTHROPIC_API_KEY
         || fs.existsSync(path.join(home,'.claude','.credentials.json'))
         || fs.existsSync(path.join(home,'.claude','credentials'));
  console.log('[claude] check:', ok);
  c.send(JSON.stringify({type:'claude-auth',ok:ok}));
};

module.exports.stop = function(c){
  console.log('[claude] stop');
  if(c.claudeQuery && c.claudeQuery.interrupt) c.claudeQuery.interrupt();
};

module.exports.close = function(c){
  if(c.claudeQuery && c.claudeQuery.close) c.claudeQuery.close();
};

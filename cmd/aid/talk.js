// Optional spoken status lines, derived locally from drawn cards. No prompt or token cost.
// On: localStorage['aid.talk'] = '1'. Pocket TTS: localStorage['aid.tts'] = 'http://localhost:8000'.

;(function(){
var T = AID.talk = {on:'1' === localStorage['aid.talk'], url:localStorage['aid.tts'] || '', now:0, next:0};
T.verb = {read:'reading', tree:'listing', find:'finding', write:'writing', edit:'patching', sh:'running',
  diff:'checking diff', web:'fetching', task:'handing off', memo:'noting', todo:'updating todos', past:'recalling', role:'setting role'};
T.what = function(say, a){
  try{ a = JSON.parse(('' + say).replace(/\r\n/g, '\n')) }catch(e){ a = {} }
  if(a.line){ return a.line.split(' ').slice(0, 2).join(' ') }
  a = a.path || a.word || a.url || a.ask || '';
  return ('' + a).split(/[\s/]+/).filter(Boolean).pop() || '';
};
T.cut = function(text){ return (('' + (text || '')).replace(/[`*#_>\[\]()]/g, '').split(/(?:[.!?]\s|\n)/)[0] || '').slice(0, 90) };
T.line = function(d){
  if('tool' === d.kind && !d.done && T.verb[d.name]){ return (T.verb[d.name] + ' ' + T.what(d.say)).trim() }
  if('tool' === d.kind && d.bad){ return d.name + ' failed' }
  if('say' === d.kind && d.done){ return T.cut(d.say) }
  if('ask' === d.kind){ return T.cut(d.say) }
  if('plan' === d.kind){ return 'plan, ' + (d.plan || []).length + ' steps' }
  if('fail' === d.kind){ return 'hit an error' }
  return '';
};
T.add = function(text){ T.next = {text:text, at:Date.now()}; if(!T.now){ T.go() } };
T.go = async function(one){
  one = T.next; T.next = 0; if(!one){ T.now = 0; return }
  if(4000 < Date.now() - one.at){ return T.go() }
  T.now = 1; try{ await T.out(one.text) }catch(e){} T.go();
};
T.out = async function(text){
  if(T.url){ try{ return await T.pock(text) }catch(e){ T.url = '' } }
  if(window.speechSynthesis && window.SpeechSynthesisUtterance){ return T.web(text) }
};
T.pock = async function(text){
  var form = new FormData(), res, buf; form.append('text', text);
  res = await fetch(T.url.replace(/\/$/, '') + '/tts', {method:'POST', body:form});
  if(!res.ok){ throw Error('tts ' + res.status) }
  T.ctx = T.ctx || new AudioContext(); buf = await T.ctx.decodeAudioData(await res.arrayBuffer());
  return new Promise(function(win){ var s = T.ctx.createBufferSource(); s.buffer = buf; s.connect(T.ctx.destination); s.onended = win; s.start() });
};
T.web = function(text){
  return new Promise(function(win, t){
    var u = new SpeechSynthesisUtterance(text); u.rate = 1.15; t = setTimeout(win, 8000); u.onend = u.onerror = function(){ clearTimeout(t); win() };
    speechSynthesis.speak(u);
  });
};
T.draw = AID.draw;
AID.draw = function(d){ T.draw(d); var line = T.on && d && T.line(d); if(line){ T.add(line) } };
kit.ear('aid.talk', function(eve, d){ d = eve.detail || eve.data || {}; T.on = !!d.on; T.url = d.url || T.url; localStorage['aid.talk'] = T.on ? '1' : '' });
document.addEventListener('click', function(){ if(T.ctx){ T.ctx.resume() } }, true);
}());

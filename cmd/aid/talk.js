// Optional spoken status lines, derived locally from drawn cards. No prompt or token cost.
// On by default; off: localStorage['aid.talk'] = '0'; Phonon only: 'phon'. Voice order: Phonon (WebGPU, lazy CDN+SRI, ~44MB model cached), Pocket TTS, browser, silent.
// Pocket TTS: localStorage['aid.tts'] = 'http://localhost:8000'.

;(function(){
var T = AID.talk = {on:'0' !== localStorage['aid.talk'], only:'phon' === localStorage['aid.talk'], url:localStorage['aid.tts'] || '', now:0, q:[]};
T.verb = {read:'reading', tree:'listing', find:'finding', write:'writing', edit:'patching', sh:'running',
  diff:'checking diff', web:'fetching', task:'handing off', memo:'noting', todo:'updating todos', past:'recalling', role:'setting role'};
T.what = function(say, a){
  try{ a = JSON.parse(('' + say).replace(/\r\n/g, '\n')) }catch(e){ a = {} }
  if(a.line){ return a.line.split(' ').slice(0, 2).join(' ') }
  a = a.path || a.word || a.url || a.ask || '';
  return ('' + a).split(/[\s/]+/).filter(Boolean).pop() || '';
};
T.cut = function(text){ return (('' + (text || '')).replace(/^\s*#.*$/gm, '').replace(/[`*#_>\[\]()]/g, '').split(/(?:[.!?]\s|\n)/).filter(function(a){ return a.trim() })[0] || '').trim().slice(0, 90) };
T.all = function(text){ // Whole reply: no code, no markdown, sentences packed into ~200 char chunks.
  var out = [], one = ''; ('' + (text || '')).replace(/```[\s\S]*?(```|$)/g, ' ').replace(/`[^`]*`/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ').replace(/[*#_>|~\[\]()]/g, ' ').split(/(?<=[.!?:])\s+|\n+/).forEach(function(a){
      a = a.replace(/\s+/g, ' ').trim(); if(!a){ return } if(one && 200 < (one + a).length){ out.push(one); one = '' } one = (one + ' ' + a).trim() });
  if(one){ out.push(one) } return out;
};
T.line = function(d){
  if('tool' === d.kind && !d.done && T.verb[d.name]){ return (T.verb[d.name] + ' ' + T.what(d.say)).trim() }
  if('tool' === d.kind && d.bad){ return d.name + ' failed' }
  if('say' === d.kind && d.done){ return T.all(d.say) }
  if('ask' === d.kind){ return T.cut(d.say) }
  if('plan' === d.kind){ return 'plan, ' + (d.plan || []).length + ' steps' }
  if('fail' === d.kind){ return 'hit an error' }
  return '';
};
T.add = function(text){ // Reply chunks always play; short event lines go stale after 4s unless Phonon only.
  [].concat(text).forEach(function(a){ T.q.push({text:a, at:Date.now(), keep:'string' !== typeof text || T.only}) }); if(!T.now){ T.go() }
};
T.go = async function(one){
  one = T.q.shift(); if(!one){ T.now = 0; return }
  if(!one.keep && 4000 < Date.now() - one.at){ return T.go() }
  T.now = 1; try{ await T.out(one.text) }catch(e){ console.log('aid.talk', e) } T.go();
};
T.cdn = 'https://cdn.jsdelivr.net/gh/blixt/phonon@36e7e5eff820733be38e9df19ccf58ae891bd45c/dist/phonon.js';
T.sri = 'sha384-rKrlL/ZO/tRU2FvCm4E+xOAadezI54AGlZc6x170GK3fk9mLaJl9E/rV1cC59xYa';
T.phon = function(s){ // SRI-checked module tag fills the module map, then import() reuses that exact copy.
  if(T.ph){ return T.ph } T.ph = (navigator.gpu ? new Promise(function(win, lose){
    s = document.createElement('script'); s.type = 'module'; s.crossOrigin = 'anonymous'; s.integrity = T.sri; s.src = T.cdn;
    s.onload = win; s.onerror = lose; document.head.appendChild(s);
  }).then(function(){ return import(T.cdn) }).then(function(m){ return m.Phonon.load({backend:'webgpu', progress:function(p){ console.log('phonon load', Math.round(p) + '%') }}) }) : Promise.reject(Error('no WebGPU'))); T.ph.then(function(){ T.ok = 1; console.log('phonon ready') }, function(e){ T.bad = 1; localStorage['aid.phon.ok'] = ''; console.log('phonon failed', e) });
  return T.ph;
};
T.pho = async function(text, tts, s, buf){
  tts = await T.phon(); s = await tts.speak(text, {voice:'Delia', speed:1.1});
  T.ctx = T.ctx || new AudioContext(); buf = T.ctx.createBuffer(1, s.audio.length, s.sampleRate); buf.copyToChannel(s.audio, 0); T.ok = 1; localStorage['aid.phon.ok'] = '1';
  return new Promise(function(win){ var n = T.ctx.createBufferSource(); n.buffer = buf; n.connect(T.ctx.destination); n.onended = win; n.start() });
};
T.out = async function(text){
  if(T.only){ return T.pho(text) }
  if(!T.ok && !T.bad && localStorage['aid.phon.ok']){ await Promise.race([T.phon().catch(function(){}), new Promise(function(w){ setTimeout(w, 3000) })]) }
  if(T.ok){ try{ return await T.pho(text) }catch(e){ console.log('phonon line failed', e) } } // Sticky: one bad line falls back alone.
  else if(!T.bad){ T.phon() }
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
kit.ear('aid.talk', function(eve, d){ d = eve.detail || eve.data || {}; T.on = !!d.on; T.url = d.url || T.url; localStorage['aid.talk'] = T.on ? '1' : '0' });
T.wake = function(){ if(T.on && !T.ph){ T.phon() } try{ (T.ctx = T.ctx || new AudioContext()).resume(); if(!T.woke && window.speechSynthesis){ T.woke = 1; speechSynthesis.speak(new SpeechSynthesisUtterance('')) } }catch(e){} };
if(T.only || localStorage['aid.phon.ok']){ T.phon() } // Worked before: preload now, every page.
['pointerdown', 'keydown'].forEach(function(e){ document.addEventListener(e, T.wake, true) });
}());

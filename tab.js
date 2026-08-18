;(function(){

shell.new('style').pin(0.1, shell).textContent = 'hint{display:block;font-size:.85em;margin:.35em 0;max-height:8em;overflow:auto;touch-action:manipulation}hint:empty{display:none}hint a{display:inline-block;border:1px solid var(--pop);border-radius:.6em;padding:.55em .7em;margin:0 .15em .25em 0;cursor:pointer;max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;user-select:none}hint a.on{background:var(--pop);color:var(--fill)}';

var TAB = shell.tab = {
  bins: 'ls cd cat pwd mkdir rm cp mv echo clear touch grep git npm ping ps whoami open help term tail claude gemini grok exit'.split(' '),
  more: { git: 'add branch checkout clone commit diff fetch init log merge pull push rebase remote reset stash status'.split(' '), npm: 'i install run test init start ci publish build'.split(' ') }
};

TAB.at = function($, s, r){
  s = getSelection();
  if(!s.rangeCount || (s.anchorNode !== $ && !$.contains(s.anchorNode))){ return ($.textContent || '').length }
  r = document.createRange();
  r.selectNodeContents($);
  r.setEnd(s.getRangeAt(0).endContainer, s.getRangeAt(0).endOffset);
  return r.toString().length;
};

TAB.go = function($, i, n, r, s){
  n = $.firstChild;
  while(n && 3 !== n.nodeType){ n = n.firstChild || n.nextSibling }
  r = document.createRange();
  if(n){ r.setStart(n, Math.max(0, Math.min(i|0, n.length))) } else { r.selectNodeContents($) }
  r.collapse(!!n);
  (s = getSelection()).removeAllRanges();
  s.addRange(r);
  $.focus();
};

TAB.part = function(line, at){
  var i = at, j = at, left, last;
  while(i > 0 && !/\s/.test(line.charAt(i - 1))){ i -= 1 }
  while(j < line.length && !/\s/.test(line.charAt(j))){ j += 1 }
  left = line.slice(0, i);
  last = left.split(/(?:&&|\|\||;|\|)/).pop() || '';
  return { i: i, word: line.slice(i, j), left: left, rest: line.slice(j), one: !/\S/.test(last), bin: ((last.match(/^\s*(\S+)/) || [])[1] || '').toLowerCase() };
};

TAB.head = function(all, a, i, n){
  if(!all.length){ return '' }
  a = all[0];
  for(i = 0; i < a.length; i += 1){
    for(n = 1; n < all.length; n += 1){
      if(all[n].charAt(i).toLowerCase() !== a.charAt(i).toLowerCase()){ return a.slice(0, i) }
    }
  }
  return a;
};

TAB.look = function(stem, bin, out){
  out = out || [];
  try{
    var all = shell.all('task[bin="ls"] iframe'), i = all.length, doc;
    while(i--){
      if(!(doc = all[i].contentDocument)){ continue }
      doc.querySelectorAll('list a').forEach(function(a){
        if(!a.where || a.id === 'up' || a.id === 'add' || '..' === a.where){ return }
        if(0 !== a.where.indexOf(stem)){ return }
        if('cd' === bin && a.file){ return }
        out.push(a.where + (a.file ? '' : '/'));
      });
      if(out.length){ break }
    }
  }catch(e){}
  return out;
};

TAB.seek = function(bit, word, all, slash){
  word = bit.word || '';
  all = [];
  if('-' === word.charAt(0)){ return all }
  if(bit.one && !/^[./~]/.test(word)){
    TAB.bins.forEach(function(b){ if(0 === b.indexOf(word)){ all.push(b + ' ') } });
    shell.all('prompt').forEach(function(p){
      var w = ((p.textContent || '').trim().split(/\s+/)[0] || '');
      if(w && 0 === w.indexOf(word) && all.indexOf(w + ' ') < 0){ all.push(w + ' ') }
    });
    if(word && all.length){ return all.sort() }
  }
  if(!bit.one && TAB.more[bit.bin] && !/^[./~]/.test(word)){
    TAB.more[bit.bin].forEach(function(s){ if(0 === s.indexOf(word)){ all.push(s + ' ') } });
  }
  slash = word.lastIndexOf('/');
  if(slash < 0){ TAB.look(word, bit.bin, all) }
  return all.filter(function(s, i){ return s && i === all.indexOf(s) }).sort();
};

TAB.wrap = function(s, raw){
  raw = (s || '').replace(/[\s\/]+$/, '');
  if(!/[^\w@%+=:,./~-]/.test(raw)){ return s }
  return "'" + raw.replace(/'/g, "'\\''") + "'" + (/\/$/.test(s) ? '/' : '') + (/\s$/.test(s) ? ' ' : '');
};

TAB.tail = function(one){ return (!one || /[\/\s]$/.test(one)) ? one : one + ' ' };

TAB.fill = function($, bit, word){
  word = TAB.wrap(word);
  $.textContent = bit.left + word + bit.rest;
  TAB.go($, bit.left.length + word.length);
};

TAB.hide = function(){
  if(TAB.hint && TAB.hint.parentNode){ TAB.hint.remove() }
  TAB.hint = TAB.hits = 0;
  TAB.nth = -1;
};

TAB.show = function($, all){
  var hint = (($.up('task')[0] || $).all('hint')[0]) || document.createElement('hint');
  if(!hint.parentNode){ $.pin(hint, 1) }
  while(hint.firstChild){ hint.removeChild(hint.firstChild) }
  all.slice(0, 48).forEach(function(w){
    var a = document.createElement('a');
    a.textContent = a.word = w;
    hint.appendChild(a);
  });
  TAB.hint = hint;
};

TAB.mark = function(){
  if(!TAB.hint){ return }
  TAB.hint.all('a').forEach(function(a, i){ a.tag('on', i === TAB.nth ? 1 : -1) });
};

TAB.run = function($, step, line, bit, all, head){
  line = ($.textContent || '').replace(/\u00a0/g, ' ').replace(/\n+$/, '');
  bit = TAB.part(line, TAB.at($));
  if(TAB.hits && TAB.was && TAB.was.i === bit.i && TAB.was.left === bit.left){
    TAB.nth = (TAB.nth + step + TAB.hits.length) % TAB.hits.length;
    TAB.fill($, TAB.was, TAB.hits[TAB.nth]);
    TAB.mark();
    return;
  }
  all = TAB.seek(bit);
  TAB.was = bit;
  TAB.hits = all;
  TAB.nth = -1;
  if(!all.length){ TAB.hide(); return }
  if(1 === all.length){ TAB.fill($, bit, TAB.tail(all[0])); TAB.hide(); return }
  head = TAB.head(all);
  if(head.length > bit.word.length){
    TAB.fill($, bit, head);
    TAB.was = TAB.part(($.textContent || '').replace(/\n+$/, ''), TAB.at($));
  }
  TAB.show($, all);
};

shell.ear('keydown', function(eve, k){
  if(!eve.target.matches('prompt') || !eve.target.getAttribute('contenteditable')){ return }
  if(eve.ctrlKey || eve.metaKey || eve.altKey){ return }
  k = (eve.key || '').toLowerCase();
  if('tab' !== k){
    if('escape' === k || 'backspace' === k || 'delete' === k || 1 === k.length){ TAB.hide() }
    return;
  }
  eve.preventDefault();
  TAB.run(shell.$ = eve.target, eve.shiftKey ? -1 : 1);
});

shell.ear('click', function(eve, a, $){
  if(!(a = eve.target.closest && eve.target.closest('hint a'))){ return }
  if(!a.word){ return }
  $ = (a.closest('task') || {}).querySelector('prompt') || shell.$;
  if(!$){ return }
  eve.preventDefault();
  TAB.fill($, TAB.was || TAB.part(($.textContent || ''), TAB.at($)), TAB.tail(a.word));
  TAB.hide();
});

kit.ear('prompt', TAB.hide);

}());

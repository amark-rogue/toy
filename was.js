;(function(W){ var T = shell.task;
W.at = function(p, s, r){
  s = getSelection();
  if(!s.rangeCount || !s.isCollapsed || (s.anchorNode !== p && !p.contains(s.anchorNode))){ return -1 }
  r = document.createRange(); r.selectNodeContents(p); r.setEnd(s.anchorNode, s.anchorOffset);
  return r.toString().length;
};
W.go = function(p, at, n, r, s){
  p.focus(); n = p.firstChild;
  while(n && 3 !== n.nodeType){ n = n.firstChild || n.nextSibling }
  r = document.createRange();
  if(n){ r.setStart(n, Math.min(at, n.length)) } else { r.selectNodeContents(p) }
  r.collapse(!!n);
  (s = getSelection()).removeAllRanges(); s.addRange(r);
};
W.step = function(t, p, add, all, at){
  all = t.was || [];
  at = null == t.pos ? all.length : t.pos;
  if(add < 0 && at === all.length){ t.note = p.textContent || '' }
  at += add;
  if(at < 0 || at > all.length){ return }
  t.pos = at;
  p.textContent = at === all.length ? (t.note || '') : all[at];
  W.go(p, add < 0 ? 0 : p.textContent.length);
};
W.task = function(t, add, p){
  t = add < 0 ? t.previousElementSibling : t.nextElementSibling;
  if(!t){ return }
  T.at = t;
  p = t.querySelector('prompt');
  W.go(shell.$ = p, add < 0 ? p.textContent.length : 0);
};
shell.ear('keydown', function(eve, p, t, key, at){
  p = eve.target;
  if(!p.matches('prompt') || eve.shiftKey || eve.ctrlKey || eve.metaKey || eve.altKey){ return }
  t = p.closest('task');
  T.at = t;
  key = eve.key;
  if('ArrowUp' === key || 'ArrowDown' === key){ eve.preventDefault(); return W.task(t, 'ArrowUp' === key ? -1 : 1) }
  if(eve.repeat || ('ArrowLeft' !== key && 'ArrowRight' !== key)){ return }
  at = W.at(p);
  if(('ArrowLeft' === key && 0 === at) || ('ArrowRight' === key && p.textContent.length === at)){
    eve.preventDefault();
    W.step(t, p, 'ArrowLeft' === key ? -1 : 1);
  }
});
shell.ear('pointerdown focusin', function(eve, t){
  if((t = eve.target.closest && eve.target.closest('task'))){ T.at = t }
});
}(shell.was = {}));

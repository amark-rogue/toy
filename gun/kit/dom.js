var dom = HTMLElement.prototype, doms = NodeList.prototype, all = function(t,e){ (t.forEach?t:[t]).forEach(e); return t; }
dom.all = function(q){ return this.querySelectorAll(q) };
dom.new = function(t){ return (this.all(t)[0]||document.createElement(t)).cloneNode(1); };
dom.ear =doms.ear= function(e,h){ return all(this,v=>{ (e+'').split(' ').forEach(n=>{ n && v.addEventListener(n,h) }) }) };
dom.tag =doms.tag= function(c,s){ return all(this,v=>{v.classList[s?(s>0?'add':'remove'):'toggle'](c)}) };
dom.pin =doms.pin= function(t,p,m,s){ p = p||0.1; if(p.pin){ p.pin(this,t); return this }
  m = {'-1':'beforebegin','-0.1':'afterbegin','0.1':'beforeend','1':'afterend'};
  return all(this,(v,i,a)=>{all(t,e=>{ v.insertAdjacentElement(m[p]||m[0.1],e) })});
}

dom.up =doms.up= function(q,l){ if(!q){ return this.parentNode }; // deprecate in favor of .closest()
  l = []; all(this,v=>{ while(v && v !== document){
    if(v.matches && v.matches(q)){ break }
    v = v.parentNode;
  }; l.push(v);
}); return l };
;(function(root){
function mug(as, g){
	if('string' == typeof as){ as = {raw: {js: as}, mug: g||mug.JS} }
	as = as || {raw: {js: ''}, mug: g||mug.JS};
	as.top = as; as.mug = as.mug || g || mug.JS;
	mug.read(as); mug.space(as); as.run = mug.run(as);
	return as;
};
mug.txt = function(as){ return as && as.raw && (as.raw.js != null? as.raw.js : as.raw) || '' }
mug.sym = function(as){ return mug.txt(as).trim() || mug.txt(as) }
mug.raw = function(s){ return {js: s || ''} }
mug.map = function(list, map, key){
	if(!list || list.map){ return list && list.map }
	map = {key: Object.create(null), all: Object.keys(list).filter(k=>k!='map')};
	map.all.sort((a,b)=>b.length-a.length);
	map.all.forEach(key=>(map.key[key[0]] || (map.key[key[0]] = [])).push(key));
	return list.map = map;
}
mug.start = function(list, text, at, map, tmp){
	map = mug.map(list); at = at || 0;
	if(!map || !(tmp = map.key[text[at]])){ return 0 }
	for(var i = 0, key; key = tmp[i++];){
		if(text.substr(at, key.length) == key){ return {start: key, at: at, end: list[key].end, rule: list[key]} }
	}
	return 0;
};
mug.end = function(key, text, i, end){ end = key.end || key.start || key; i = (i||0)-1;
	while((i = text.indexOf(end, i+1)) >= 0){ if(!(mug.retro(text, i) % 2)){ break } }
	return i + 1;
}
mug.retro = function(t,i,l,c){ c = 0; while((l||'\\') == t[--i]){ c++ } return c }
mug.flat = function(as, r){ r = []; while(as){ if(mug.txt(as)){ r.push(mug.txt(as)) } as = as.next } return r }
mug.put = function(as, raw){ as.raw = mug.raw(raw); return as }
mug.set = function(to, add){ if(add){ Object.keys(add).forEach(k=>to[k] = add[k]) } return to }
mug.link = function(as, raw, add, tmp){
	if(!raw){ return }
	tmp = as.tail? {top: as, raw: mug.raw(raw), up: as.up, mug: as.mug} : as;
	tmp.raw = mug.raw(raw); tmp.top = as; tmp.mug = as.mug; tmp.up = as.up; mug.set(tmp, add);
	if(as.tail){ tmp.back = as.tail; as.tail.next = tmp }
	as.tail = tmp;
	as.num = (as.num || 0) + 1;
	if(tmp.up && !tmp.up.nest && !tmp.shut){ tmp.up.nest = tmp }
	return tmp;
}
mug.word = function(as, raw, hit){
	if(!raw){ return }
	hit = as.mug.key && as.mug.key[raw];
	mug.link(as, raw, hit? {key: hit} : 0);
}
mug.re = function(as, raw){
	while(as && /^\s*$/.test(mug.txt(as))){ as = as.back }
	raw = mug.txt(as);
	return !raw || as && as.key && as.key.pre || as && as.sep && /^[({[=,:;!&|?+\-*%^~<>]$/.test(raw) || as && as.rule;
}
mug.read = function(as, text, g, i, l, buf, hit, top, end, raw){
	text = mug.txt(as); g = as.mug || mug.JS; as.mug = g; as.top = as; as.raw = mug.raw(''); as.tail = 0; as.num = 0; buf = ''; top = [];
	for(i = 0, l = text.length; i < l;){
		if(hit = mug.start(g.escape, text, i)){
			if(hit.start == '/' && text[i+1] != '/' && text[i+1] != '*' && !mug.re(as.tail)){ hit = 0 }
		}
		if(hit){
			mug.word(as, buf); buf = '';
			end = mug.end(hit, text, i + hit.start.length) || l + 1;
			raw = text.slice(i, end - 1 + (hit.end || hit.start).length);
			mug.link(as, raw, {escape: hit});
			i += raw.length; continue;
		}
		if(top.length && text.substr(i, top[top.length - 1].form.end.length) == top[top.length - 1].form.end){
			mug.word(as, buf); buf = '';
			as.up = top.pop();
			as.up.end = mug.link(as, text.substr(i, as.up.form.end.length), {up: as.up, shut: as.up});
			as.up = top[top.length - 1];
			i += mug.txt(as.tail).length; continue;
		}
		if(hit = mug.start(g.nest, text, i)){
			mug.word(as, buf); buf = '';
			top.push(as.up = mug.link(as, hit.start, {form: hit, up: as.up}));
			i += hit.start.length; continue;
		}
		if(hit = mug.start(g.separate, text, i)){
			mug.word(as, buf); buf = '';
			mug.link(as, hit.start, {sep: hit, rule: g.op && g.op[hit.start]});
			i += hit.start.length; continue;
		}
		buf += text[i++];
	}
	mug.word(as, buf); delete as.tail;
	return as;
}
mug.drop = function(as){
	if(as.back){ as.back.next = as.next }
	if(as.next){ as.next.back = as.back }
	(as.top || as).num--;
	return as.next;
}
mug.space = function(as, raw, next, back){
	while(as){
		raw = mug.txt(as); next = as.next; back = as.back;
		if(/^[ \t]+$/.test(raw)){
			if(next && (next.sep || next.form || next.shut)){ mug.put(next, raw + mug.txt(next)); as = mug.drop(as); continue }
			if(back){ mug.put(back, mug.txt(back) + raw); as = mug.drop(as); continue }
		}
		as = as.next;
	}
}
mug.add = function(a, as, raw){
	raw = mug.txt(as);
	if(as.escape && as.escape.start == '//' && raw[raw.length - 1] == '\n'){
		a.push(mug.set({raw: mug.raw(raw.slice(0, -1)), top: as.top, mug: as.mug, up: as.up, node: as}, {escape: as.escape}));
		a.push({raw: mug.raw('\n'), top: as.top, mug: as.mug, up: as.up, mark: 1});
		return;
	}
	a.push(as);
}
mug.tok = function(as, end, a){
	a = [];
	while(as && as !== end){
		if(mug.txt(as)){ mug.add(a, as) }
		as = as.form && as.end? as.end.next : as.next;
	}
	return a;
}
mug.node = function(type, raw, add){
	var n = type == 'run'? [] : {};
	n.type = type; n.raw = mug.raw(raw || '');
	return mug.set(n, add);
}
mug.text = function(n, a){
	if(!n){ return '' }
	if(n.type == 'op' && (n.op == '.' || n.op == '?.')){ return mug.text(n.L) + n.op + mug.text(n.J) }
	if(n.type == 'op'){ return (mug.text(n.L) + ' ' + n.op + ' ' + mug.text(n.J)).trim() }
	if(n.type == 'run'){ a = []; for(var i = 0; i < n.length; i++){ if(mug.text(n[i])){ a.push(mug.text(n[i])) } } return a.join(' ') }
	if(n.type == 'nest'){ return mug.txt(n) + mug.text(n.run) + (n.end? mug.txt(n.end) : '') }
	if(n.raw){ return mug.txt(n) }
	return '';
}
mug.mark = function(as){ as.type = 'mark'; return as }
mug.val = function(as){
	as.type = as.form? 'nest' : 'val';
	if(as.form){ as.run = as.run || mug.run(as.next, as.end, ',') }
	return as;
}
mug.skip = function(t){ return !t || /^\s+$/.test(mug.txt(t)) || t.escape && (t.escape.start == '//' || t.escape.start == '/*') }
mug.first = function(tok, b, e){ while(b < e && mug.skip(tok[b])){ b++ } return b }
mug.last = function(tok, b, e){ while(e > b && mug.skip(tok[e - 1])){ e-- } return e }
mug.putrun = function(out, tok, b, e){
	b = mug.first(tok, b, e); e = mug.last(tok, b, e);
	if(b < e){ out.push(mug.expr(tok, b, e)) }
}
mug.part = function(tok, b, e, by, out, at, t){
	if('string' == typeof b){ by = b; b = 0; e = tok.length }
	out = mug.node('run', '', {by: by}); at = b;
	for(var i = b; i < e; i++){
		t = tok[i];
		if(mug.sym(t) == by){ mug.putrun(out, tok, at, i); at = i + 1 }
	}
	mug.putrun(out, tok, at, e);
	return out;
}
mug.run = function(as, end, by, out, tok, at, t, raw){
	out = mug.node('run', '', {by: by || ';'}); tok = mug.tok(as, end); at = 0;
	for(var i = 0; i < tok.length; i++){
		t = tok[i]; raw = mug.txt(t);
		if(mug.sym(t) == (by || ';') || (!by && raw == '\n')){ mug.putrun(out, tok, at, i); at = i + 1 }
	}
	mug.putrun(out, tok, at, tok.length);
	return out;
}
mug.bin = function(tok, b, e, best, at, op, raw, rule){
	for(var i = b; i < e; i++){
		raw = mug.sym(tok[i]); rule = tok[i].rule || tok[i].key && tok[i].key.op;
		if(rule && rule.rank && (!best || rule.rank < best || rule.rank == best && rule.side != 'right')){
			best = rule.rank; at = i; op = raw;
		}
	}
	if(at != null){ return mug.set(tok[at], {type: 'op', L: mug.expr(tok, b, at), op: op, J: mug.expr(tok, at + 1, e), rule: tok[at].rule || tok[at].key && tok[at].key.op}) }
}
mug.call = function(tok, b, e, n){
	if(b + 1 < e && tok[b + 1].form && mug.sym(tok[b + 1]) == '('){
		return mug.set(tok[b], {type: 'op', L: mug.node('val', ''), op: mug.sym(tok[b]), J: tok[b + 1].run || mug.run(tok[b + 1].next, tok[b + 1].end, ','), aft: b + 2 < e? mug.expr(tok, b + 2, e) : 0});
	}
}
mug.ctrl = function(tok, b, e, raw, n){
	raw = mug.sym(tok[b]);
	if(tok[b] && tok[b].key && tok[b].key.ctrl && tok[b + 1] && tok[b + 1].form){
		n = mug.set(tok[b], {type: 'op', L: tok[b + 1].run || mug.run(tok[b + 1].next, tok[b + 1].end, ','), op: raw, J: tok[b + 2] && tok[b + 2].form? tok[b + 2].run || mug.run(tok[b + 2].next, tok[b + 2].end) : mug.expr(tok, b + 2, e)});
		if(tok[b + 3]){ n.aft = mug.expr(tok, b + 3, e) }
		return n;
	}
}
mug.func = function(tok, b, e, raw, at, n){
	if(!tok[b]){ return }
	raw = mug.sym(tok[b]); at = raw == 'async'? b + 1 : b;
	if(tok[at] && mug.sym(tok[at]) == 'function'){
		n = mug.set(tok[at], {type: 'op', L: mug.node('run', ''), op: 'function', J: mug.node('run', '')});
		if(at > b){ n.pre = [mug.mark(tok[b])] }
		if(tok[at + 1] && !tok[at + 1].form){ n.name = mug.val(tok[at + 1]); at++ }
		if(tok[at + 1] && tok[at + 1].form){ n.L = tok[at + 1].run || mug.run(tok[at + 1].next, tok[at + 1].end, ',') }
		if(tok[at + 2] && tok[at + 2].form){ n.J = tok[at + 2].run || mug.run(tok[at + 2].next, tok[at + 2].end) }
		if(at + 3 < e){ n.aft = mug.expr(tok, at + 3, e) }
		return n;
	}
}
mug.decl = function(tok, b, e, raw, n, run){
	raw = mug.sym(tok[b]);
	if(tok[b] && tok[b].key && tok[b].key.dec){
		run = mug.part(tok, b + 1, e, ',');
		for(var i = 0; i < run.length; i++){ (run[i].pre || (run[i].pre = [])).push(mug.mark(tok[b])) }
		return run.length == 1? run[0] : run;
	}
}
mug.expr = function(tok, b, e, n, raw){
	b = mug.first(tok, b || 0, e == null? tok.length : e); e = mug.last(tok, b, e == null? tok.length : e);
	if(b >= e){ return mug.node('val', '') }
	if(e - b > 1 && mug.sym(tok[b]) == '(' && tok[e - 1] === tok[b].end){ return mug.expr(mug.tok(tok[b].next, tok[b].end)) }
	if(n = mug.decl(tok, b, e)){ return n }
	if(n = mug.func(tok, b, e)){ return n }
	if(n = mug.ctrl(tok, b, e)){ return n }
	raw = mug.sym(tok[b]);
	if(tok[b].key && tok[b].key.pre && b + 1 < e){ return mug.set(tok[b], {type: 'op', L: mug.node('val', ''), op: raw, J: mug.expr(tok, b + 1, e)}) }
	for(var i = b; i < e; i++){ if(mug.sym(tok[i]) == ':'){ return mug.set(tok[i], {type: 'op', L: mug.expr(tok, b, i), op: ':', J: mug.expr(tok, i + 1, e)}) } }
	if(n = mug.bin(tok, b, e)){ return n }
	if(n = mug.call(tok, b, e)){ return n }
	if(e - b == 1){ return tok[b].type? tok[b] : mug.val(tok[b]) }
	n = mug.node('run', '');
	for(i = b; i < e; i++){ if(!mug.skip(tok[i])){ n.push(tok[i].type? tok[i] : mug.val(tok[i])) } }
	return n;
}
mug.esc = function(as){ return mug.read(as) };
mug.nest = function(as){ return as };
mug.sep = function(as){ return as };
mug.all = {is: {}, not: {}, next: '. ', split: {}}
mug.JS = {
	escape: {"'": {}, '"': {}, '`': {}, '//': {end: '\n'}, '/*': {end: '*/'}, '/': {}},
	nest: {'{': {end: '}'}, '(': {end: ')'}, '[': {end: ']'}},
	separate: {'\n': {}, '\t': {}, ' ': {}, '...': {}, '>>>': {}, '===': {}, '!==': {}, '**=': {}, '==': {}, '+=': {}, '-=': {}, '*=': {}, '/=': {}, '%=': {}, '>=': {}, '<=': {}, '=>': {}, '++': {}, '--': {}, '**': {}, '&&': {}, '||': {}, '<<': {}, '>>': {}, '?.': {}, ';': {}, ',': {}, ':': {}, '.': {}, '!': {}, '=': {}, '>': {}, '<': {}, '-': {}, '+': {}, '*': {}, '/': {}, '?': {}, '%': {}, '^': {}, '&': {}, '|': {}, '~': {}},
	op: {'=': {rank: 1, side: 'right'}, '+=': {rank: 1, side: 'right'}, '-=': {rank: 1, side: 'right'}, '*=': {rank: 1, side: 'right'}, '/=': {rank: 1, side: 'right'}, '%=': {rank: 1, side: 'right'}, '=>': {rank: 1, side: 'right'}, '||': {rank: 2}, '&&': {rank: 3}, '|': {rank: 4}, '^': {rank: 5}, '&': {rank: 6}, '==': {rank: 7}, '===': {rank: 7}, '!=': {rank: 7}, '!==': {rank: 7}, '>': {rank: 8}, '<': {rank: 8}, '>=': {rank: 8}, '<=': {rank: 8}, 'in': {rank: 8}, 'of': {rank: 8}, 'instanceof': {rank: 8}, '<<': {rank: 9}, '>>': {rank: 9}, '>>>': {rank: 9}, '+': {rank: 10}, '-': {rank: 10}, '*': {rank: 11}, '/': {rank: 11}, '%': {rank: 11}, '**': {rank: 12, side: 'right'}, '.': {rank: 13}, '?.': {rank: 13}},
	key: {'import': {pre: 1}, 'from': {}, 'as': {}, 'function': {op: {rank: 0}}, 'return': {pre: 1}, 'async': {pre: 1}, 'await': {pre: 1}, 'yield': {pre: 1}, 'case': {pre: 1}, 'break': {pre: 1}, 'switch': {ctrl: 1}, 'default': {pre: 1}, 'continue': {pre: 1}, 'var': {dec: 1, pre: 1}, 'let': {dec: 1, pre: 1}, 'const': {dec: 1, pre: 1}, 'undefined': {}, 'null': {}, 'else': {pre: 1}, 'if': {ctrl: 1}, 'do': {ctrl: 1}, 'for': {ctrl: 1}, 'while': {ctrl: 1}, 'throw': {pre: 1}, 'finally': {pre: 1}, 'catch': {ctrl: 1}, 'try': {pre: 1}, 'instanceof': {op: {rank: 8}}, 'typeof': {pre: 1}, 'constructor': {}, 'extends': {op: {rank: 8}}, 'static': {pre: 1}, 'super': {}, 'class': {pre: 1}, 'this': {}, 'get': {pre: 1}, 'set': {pre: 1}, 'new': {pre: 1}, 'delete': {pre: 1}, 'in': {op: {rank: 8}}, 'of': {op: {rank: 8}}, 'void': {pre: 1}}
}
root.mug = root.MUG = mug;
}(this));

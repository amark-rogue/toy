/*
CODEX: MUG stands for "Mathematical Universal Grammar", it is a library that takes a programming language definition (see the javascript language example later in this file) and some text code of that language and returns a parsed generic linked list graph abstract syntax tree that reuses the following structure at every point:

{
	mug: mug, // a reference to `top.mug` language definition, see JS language example later on
	top: top, // every sub/object has a reference to the top root
	raw: text, // the raw substring for this portion of the parsed text's code, for example "var x = 2;" we'd have "var ", "x", " = ", "2", ";" as raw pieces.
	back: back, // in the prior example, the "x" object's back would be the "var " object.
	next: next, // in the prior example, the "x" object's next would be the " = " object.
	up: up, // for "var l = [1,2,3];" the "2" object's up would be the "[" object.
	end: end, // in the prior example, the "[" object's end would be the "]" object.
	down: down, // in the prior example, the "[" object's down would be the "1" object (also happens to be the next object also).
}

So far we have a mostly working start to our parser, please re-use the same coding style (compact, concise, mathematical, follow ./contributing.md guidelines) and extremely optimize for speed & performance in the code (try to do everything in as close to O(log N) time or faster, DO NOT loop over a list multiple times when it can be done together in 1 loop).

Please also generate tests in a mug.html file that start with super simple JS text code examples and progress into complicated examples including parsing this file mug.js itself.
*/
function mug(as, g, tmp){
	if('string' == typeof as){ as = {raw: as, mug: g||mug.JS} }
	as = as || {raw: text, mug: g||mug.JS};
	as.top = as;
	mug.read(as);
	return as;
};
mug.map = function(list, map, key, tmp){
	if(!list || list._map){ return list && list._map }
	map = {key: Object.create(null), all: Object.keys(list).filter(k=>k[0] != '_')};
	map.all.sort((a,b)=>b.length-a.length);
	map.all.forEach(key=>(map.key[key[0]] || (map.key[key[0]] = [])).push(key));
	return list._map = map;
}
mug.start = function(list, text, at, map, tmp){
	map = mug.map(list);
	if(!map || !(tmp = map.key[text[at||0]])){ return 0 }
	for(var i = 0, key; key = tmp[i++];){
		if(text.substr(at||0, key.length) == key){ return {start: key, at: at||0, end: list[key].end, rule: list[key]} }
	}
	return 0;
};
mug.end = function(key, text, i, end){ end = key.end||key.start||key; i = (i||0)-1;
	while((i = text.indexOf(end, i+1))>=0){
		if(!(mug.retro(text,i) % 2)){ break }
	}
	return i+1;
}
mug.retro = function(t,i,l,c){ c=0; while((l||'\\') == t[--i]){ c++ } return c }
mug.flat = function(as, r){ r = [];
	while(as){ if(as.raw){ r.push(as.raw) } as = as.next }
	return r;
}
mug.link = function(as, raw, add, tmp){
	if(!raw){ return }
	tmp = as.tail? {top: as, raw: raw, up: as.up} : as;
	tmp.raw = raw; tmp.top = as; tmp.mug = as.mug; tmp.up = as.up;
	if(add){ Object.keys(add).forEach(k=>tmp[k] = add[k]) }
	if(as.tail){ tmp.back = as.tail; as.tail.next = tmp }
	as.tail = tmp;
	if(tmp.up && !tmp.up.down && !tmp.shut){ tmp.up.down = tmp }
	return tmp;
}
mug.word = function(as, raw, i, tmp){
	if(!raw){ return }
	tmp = as.mug.key && as.mug.key[raw];
	mug.link(as, raw, tmp? {key: tmp} : 0);
}
mug.re = function(as, raw){
	while(as && /^\s*$/.test(as.raw)){ as = as.back }
	raw = as && as.raw;
	return !raw || /^(return|throw|case|delete|void|typeof|instanceof|in|of|new)$/.test(raw) || /^[({[=,:;!&|?+\-*%^~<>]$/.test(raw) || /^(=>|&&|\|\||\+=|-=|\*=|\/=|%=|==|===|!=|!==|>=|<=|\*\*)$/.test(raw);
}
mug.read = function(as, text, g, i, l, buf, hit, top, end){
	text = as.raw || ''; g = as.mug || mug.JS; as.mug = g; as.top = as; as.raw = ''; as.tail = 0; buf = ''; top = [];
	for(i = 0, l = text.length; i < l;){
		if(hit = mug.start(g.escape, text, i)){
			if(hit.start == '/' && text[i+1] != '/' && text[i+1] != '*' && !mug.re(as.tail)){ hit = 0 }
		}
		if(hit){
			mug.word(as, buf); buf = '';
			end = mug.end(hit, text, i + hit.start.length) || l + 1;
			mug.link(as, text.slice(i, end - 1 + (hit.end||hit.start).length), {escape: hit});
			i = end - 1 + (hit.end||hit.start).length;
			continue;
		}
		if(top.length && text.substr(i, top[top.length - 1].form.end.length) == top[top.length - 1].form.end){
			mug.word(as, buf); buf = '';
			as.up = top.pop();
			as.up.end = mug.link(as, text.substr(i, as.up.form.end.length), {up: as.up, shut: as.up});
			as.up = top[top.length - 1];
			i += as.tail.raw.length;
			continue;
		}
		if(hit = mug.start(g.down, text, i)){
			mug.word(as, buf); buf = '';
			top.push(as.up = mug.link(as, hit.start, {form: hit, up: as.up}));
			i += hit.start.length;
			continue;
		}
		if(hit = mug.start(g.separate, text, i)){
			mug.word(as, buf); buf = '';
			mug.link(as, hit.start, {sep: hit});
			i += hit.start.length;
			continue;
		}
		buf += text[i++];
	}
	mug.word(as, buf);
	delete as.tail;
	return as;
}
mug.esc = function(as){ return mug.read(as) };
mug.down = function(as){ return as };
mug.sep = function(as){ return as };
mug.all = { is: {}, not: {}, next: '. ', split: {} }

// CODEX: developers should be able to define & describe their programming language with this format:
mug.JS = {
	escape: { "'": {}, '"': {}, '`': {}, '//': {end: '\n'}, '/*': {end: '*/'}, '/': {} },
	down: { '{': {end: '}'}, '(': {end: ')'}, '[': {end: ']'} },
	separate: {
		'\n': {},
		'\t': {},
		' ': {},
		
		'...': {},
		'>>>': {},
		'===': {},
		'!==': {},
		'**=': {},
		'==': {},
		'+=': {},
		'-=': {},
		'*=': {},
		'/=': {},
		'%=': {},
		'>=': {},
		'<=': {},
		'=>': {},
		
		'++': {},
		'--': {},
		'**': {},
		'&&': {},
		'||': {},
		'<<': {},
		'>>': {},
		'?.': {},

		';': {},
		',': {},
		':': {},
		'.': {},
		'!': {},
		'=': {},
		'>': {},
		'<': {},
		'-': {},
		'+': {},
		'*': {},
		'/': {},
		'?': {},
		'%': {},
		'^': {},
		'&': {},
		'|': {},
		'~': {}
	},
	key: {
		'import': {},
		'from': {},
		'as': {},

		'function': {},
		'return': {},
		'async': {},
		'await': {},
		'yield': {},
		'case': {},
		'break': {},
		'switch': {},
		'default': {},
		'continue': {},

		'var': {},
		'let': {},
		'const': {},

		'undefined': {},
		'null': {},

		'else': {},
		'if': {},
		'do': {},
		'for': {},
		'while': {},

		'throw': {},
		'finally': {},
		'catch': {},
		'try': {},

		'instanceof': {},
		'typeof': {},

		'constructor': {},
		'extends': {},
		'static': {},
		'super': {},
		'class': {},
		'this': {},
		'get': {},
		'set': {},
		'new': {},
		
		'delete': {},
		'in': {},
		'of': {},
		'void': {}
	}
}
// CODEX: Bonus points (but do not do it yet) suggest how we can support Python style indentation based down nesting.


var Text = {prototype:{}}; Text.prototype.cut = function(f, e, c){ e = e||{}, c = c||'\\';
  var q = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), L = v => ('string' == typeof v)?[v]:v,
  	P = Object.entries(e).map(([k, v]) => q(k)+'[^]*?(?:'+L(v.end||v||k).map(q).join('|')+'|$)').concat(c? q(c)+'[^]' : []),
  	R = new RegExp((P.length? '(?:'+P.join('|')+')|' : '') + '('+L(f).sort((a, b) => b.length - a.length).map(q).join('|')+')', 'g'), m;
  for(;m = R.exec(this);){ if(m[1]){ return [this.slice(0,m.index), m[1], this.slice(m.index+m[1].length)] } }
  return ['','',''+this];
};

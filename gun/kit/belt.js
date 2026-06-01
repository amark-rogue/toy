;(function(){
var W = window, D = document, on = 'addEventListener', st, no, cut = 6, rail = 7;

function css(){
	var s = D.createElement('style');
	s.textContent = 'kit{width:'+rail+'em!important;overflow:visible!important;pointer-events:none!important;touch-action:none!important}kit tin{pointer-events:none!important;will-change:transform;touch-action:none!important}.belt{width:'+rail+'em!important;overflow:visible!important;pointer-events:none!important;scroll-snap-type:none!important;touch-action:none!important}.belt:before{display:none!important}.belt .drawer{will-change:transform;pointer-events:auto!important;touch-action:none!important}.belt button{pointer-events:auto!important;touch-action:none!important}kit tin > button{pointer-events:auto!important;touch-action:none!important}';
	D.head.appendChild(s);
}

function up(n, q){
	while(n && n !== D){
		if(n.matches && n.matches(q)){ return n }
		n = n.parentNode;
	}
}

function hit(e, n){
	n = e.target;
	while(n && n !== D){
		if(n.matches && (n.matches('kit tin > button') || n.matches('.belt button') || n.matches('.belt .drawer'))){ return n }
		n = n.parentNode;
	}
}

function clamp(v, max){ return Math.max(0, Math.min(max || 0, v || 0)) }

function setX(b, v, d){
	if(!b || !b.draw){ return }
	b.pos = v;
	b.draw.style.transition = d ? 'transform '+d+'ms cubic-bezier(.16,.8,.2,1)' : 'none';
	b.draw.style.transform = 'translate3d('+(-b.pos)+'px,0,0)';
}

function setY(k, v, d){
	if(!k || !k.tin){ return }
	k.pos = v;
	k.tin.style.transition = d ? 'transform '+d+'ms cubic-bezier(.16,.8,.2,1)' : 'none';
	k.tin.style.transform = 'translate3d(0,'+(-k.pos)+'px,0)';
}

function prepB(b){
	if(!b){ return b }
	b.draw = b.querySelector('.drawer'); if(!b.draw){ return b }
	if(!b.ready){ b.ready = 1; b.pos = 0; }
	b.max = Math.max(0, b.draw.scrollWidth - rail * parseFloat(getComputedStyle(D.documentElement).fontSize || 16));
	return b;
}

function prepK(k){
	if(!k){ return k }
	k.tin = k.querySelector('tin'); if(!k.tin){ return k }
	if(!k.ready){ k.ready = 1; k.pos = 0; }
	k.max = Math.max(0, k.scrollHeight - W.innerHeight);
	return k;
}

function begin(e, t, n, b, k){
	if(!(n = hit(e))){ return }
	t = e.touches && e.touches[0]; if(!t){ return }
	b = prepB(up(n, '.belt'));
	k = prepK(up(n, 'kit'));
	st = {x:t.clientX, y:t.clientY, lx:t.clientX, ly:t.clientY, t:Date.now(), vx:0, vy:0, axis:'', move:0, belt:b, kit:k};
	if(b && b.ani){ W.cancelAnimationFrame(b.ani); b.ani = 0 }
	if(k && k.ani){ W.cancelAnimationFrame(k.ani); k.ani = 0 }
	if(b && b.draw){ b.draw.style.transition = 'none' }
	if(k && k.tin){ k.tin.style.transition = 'none' }
}

function move(e, t, now, dx, dy, dt, ax, ay){
	if(!st){ return }
	t = e.touches && e.touches[0]; if(!t){ return }
	now = Date.now(); dx = t.clientX - st.lx; dy = t.clientY - st.ly; dt = Math.max(1, now - st.t);
	ax = Math.abs(t.clientX - st.x); ay = Math.abs(t.clientY - st.y);
	if(!st.axis && (ax > cut || ay > cut)){ st.axis = ax > ay ? 'x' : 'y' }
	if(st.axis == 'x' && st.belt){
		var p = st.belt.pos - dx;
		if(p < 0 || p > st.belt.max){ dx *= 0.3; p = st.belt.pos - dx; }
		setX(st.belt, p);
		st.vx = -dx / dt;
		st.move = 1; e.preventDefault();
	}
	else if(st.axis == 'y' && st.kit){
		var p = st.kit.pos - dy;
		if(p < 0 || p > st.kit.max){ dy *= 0.3; p = st.kit.pos - dy; }
		setY(st.kit, p);
		st.vy = -dy / dt;
		st.move = 1; e.preventDefault();
	}
	st.lx = t.clientX; st.ly = t.clientY; st.t = now;
}

function glideX(b, v){
	if(!b){ return }
	var out = 0;
	if(b.pos < 0){ out = 0 - b.pos }
	else if(b.pos > b.max){ out = b.max - b.pos }

	var v_frame = v * 16;
	if(out !== 0){
		v_frame += out * 0.03;
		v_frame *= 0.85;
	} else {
		v_frame *= 0.94;
	}
	v = v_frame / 16;

	var nextPos = b.pos + v_frame;

	if(out !== 0){
		if((b.pos > b.max && nextPos <= b.max) || (b.pos < 0 && nextPos >= 0)){
			nextPos = b.pos > b.max ? b.max : 0;
			v = 0;
		}
	}

	setX(b, nextPos);

	if(Math.abs(v) < 0.01 && nextPos >= 0 && nextPos <= b.max){ return }
	b.ani = W.requestAnimationFrame(function(){ glideX(b, v) });
}

function glideY(k, v){
	if(!k){ return }
	var out = 0;
	if(k.pos < 0){ out = 0 - k.pos }
	else if(k.pos > k.max){ out = k.max - k.pos }

	var v_frame = v * 16;
	if(out !== 0){
		v_frame += out * 0.03;
		v_frame *= 0.85;
	} else {
		v_frame *= 0.94;
	}
	v = v_frame / 16;

	var nextPos = k.pos + v_frame;

	if(out !== 0){
		if((k.pos > k.max && nextPos <= k.max) || (k.pos < 0 && nextPos >= 0)){
			nextPos = k.pos > k.max ? k.max : 0;
			v = 0;
		}
	}

	setY(k, nextPos);

	if(Math.abs(v) < 0.01 && nextPos >= 0 && nextPos <= k.max){ return }
	k.ani = W.requestAnimationFrame(function(){ glideY(k, v) });
}

function end(){
	if(st && st.move){ no = 1; setTimeout(function(){ no = 0 }, 450) }
	if(st && st.axis == 'x'){ glideX(st.belt, st.vx) }
	if(st && st.axis == 'y'){ glideY(st.kit, st.vy) }
	st = 0;
}

function tap(e){
	if(no){ e.preventDefault(); e.stopPropagation() }
}

css();
D[on]('touchstart', begin, true);
D[on]('touchmove', move, {capture:true, passive:false});
D[on]('touchend', end, true);
D[on]('touchcancel', end, true);
D[on]('click', tap, true);

}());
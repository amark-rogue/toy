;(function(){
var W = window, D = document, on = 'addEventListener', st, no, cut = 6;
function hit(e, n){
	n = e.target;
	while(n && n !== D){
		if(n.matches && (n.matches('kit tin > button') || n.matches('.belt button') || n.matches('.belt .drawer'))){ return n }
		n = n.parentNode;
	}
}
function up(n, q){
	while(n && n !== D){
		if(n.matches && n.matches(q)){ return n }
		n = n.parentNode;
	}
}
function begin(e, t, n){
	if(!(n = hit(e))){ return }
	t = e.touches && e.touches[0]; if(!t){ return }
	st = {
		x: t.clientX, y: t.clientY,
		lx: t.clientX, ly: t.clientY,
		belt: up(n, '.belt'),
		draw: up(n, '.drawer'),
		kit: up(n, 'kit'),
		axis: '',
		move: 0,
		pos: 0,
		max: 0
	};
	if(st.belt){
		st.pos = st.belt.__belt || st.belt.scrollLeft || 0;
		st.max = Math.max(0, st.belt.scrollWidth - st.belt.clientWidth, st.draw && st.draw.scrollWidth - st.belt.clientWidth);
		if(st.draw){ st.draw.style.transition = 'none' }
	}
}
function show(){
	if(!st || !st.belt){ return }
	st.belt.__belt = st.pos = Math.max(0, Math.min(st.max, st.pos));
	st.belt.scrollLeft = st.pos;
	if(st.draw){
		st.draw.style.transform = Math.abs(st.belt.scrollLeft - st.pos) < 1 ? '' : 'translate3d(' + (-st.pos) + 'px,0,0)';
	}
}
function move(e, t, dx, dy, ax, ay){
	if(!st){ return }
	t = e.touches && e.touches[0]; if(!t){ return }
	dx = t.clientX - st.lx; dy = t.clientY - st.ly;
	ax = Math.abs(t.clientX - st.x); ay = Math.abs(t.clientY - st.y);
	if(!st.axis && (ax > cut || ay > cut)){ st.axis = ax > ay ? 'x' : 'y' }
	if(st.axis == 'x' && st.belt){
		st.pos -= dx;
		show();
		st.move = 1;
		e.preventDefault();
	}
	if(st.axis == 'y' && st.kit){
		st.kit.scrollTop -= dy;
		st.move = 1;
		e.preventDefault();
	}
	st.lx = t.clientX; st.ly = t.clientY;
}
function end(){
	if(st && st.move){ no = 1; setTimeout(function(){ no = 0 }, 450) }
	st = 0;
}
function tap(e){
	if(no){
		e.preventDefault();
		e.stopPropagation();
	}
}
D[on]('touchstart', begin, true);
D[on]('touchmove', move, {capture: true, passive: false});
D[on]('touchend', end, true);
D[on]('touchcancel', end, true);
D[on]('click', tap, true);
}());

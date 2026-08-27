// Clone and update the transcript's declared card models.

var AID = {row:Object.create(null), seen:Object.create(null), job:''};
AID.dom = document.body;
AID.box = AID.dom.all('.feed')[0]; AID.bar = AID.dom.all('.bar')[0]; AID.mod = AID.dom.all('.model')[0];
AID.kind = {say:1,think:1,stat:1,tool:1,plan:1,ask:1,diff:1,done:1,fail:1};
AID.get = function(kind, id){
  var row = AID.row[id], mark, next; kind = AID.kind[kind] ? kind : 'say';
  if(row && kind === row.dataset.kind){ return row }
  next = AID.mod.new('.' + kind);
  next.dataset.id = id; next.dataset.kind = kind; AID.row[id] = next;
  if('think' === kind){ next.ear('toggle', function(){ if(this.open){ AID.mark(this, this.aid) } }) }
  if(row && row.parentNode){ row.pin(next, -1); row.remove() } else { AID.box.pin(next) }
  return next;
};
AID.text = function(row, find, text){
  var node = row.all(find)[0]; if(node){ node.textContent = text || '' }
};
AID.mark = function(row, text){
  var box = row.all('.md')[0]; if(!box){ return }
  if(AID.md){ AID.md.draw(box, text) } else { box.textContent = text || '' }
};
AID.host = function(raw){
  var at, n;
  if(raw && 'object' === typeof raw){ raw = null != raw.raw ? raw.raw : null != raw.$ ? raw.$ : '' }
  raw = ('' + (raw || '')).replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, '');
  at = raw.search(/\r\n|\n|\r/);
  if(0 <= at){ n = '\r\n' === raw.slice(at, at + 2) ? 2 : 1; raw = raw.slice(at + n) }
  AID.draw({kind:'say', id:'host', n:0, say:raw || '(empty response)', done:1});
};
AID.plan = function(row, all){
  var list = row.all('ol')[0], mark = list.all('li')[0], one, i;
  while(list.firstChild){ list.removeChild(list.firstChild) }
  for(i = 0; i < (all || []).length; i++){ one = mark.cloneNode(true); one.textContent = all[i]; list.pin(one) }
};
AID.ask = function(row, d){
  var box = row.all('.picks')[0], mark = box.all('button')[0], input = row.all('input')[0], one, all = d.pick || [], i;
  AID.text(row, 'b', 'gate' === d.gate ? 'Permission' : 'key' === d.gate ? 'Credential' : 'Question'); AID.text(row, 'pre', d.say);
  while(box.firstChild){ box.removeChild(box.firstChild) }
  for(i = 0; i < all.length; i++){ one = mark.cloneNode(true); one.textContent = all[i]; one.value = all[i]; box.pin(one) }
  input.type = d.secret ? 'password' : 'text'; input.tag('hide', all.length ? 1 : -1);
  row.all('.send')[0].tag('hide', all.length ? 1 : -1);
};
AID.draw = function(d){
  var id, row, kind = d.kind;
  if('head' === d.kind){
    AID.bar.tag('hide', -1); AID.bar.all('.stop')[0].tag('hide', -1);
    AID.text(AID.bar, '.title', d.say); AID.job = d['#'] || AID.job; return;
  }
  if('say' === kind && d.live && !d.done){ kind = 'think' }
  id = d.id || d.kind + d.n; row = AID.get(kind, id);
  if('think' === kind){ row.aid = d.say || ''; if(row.open){ AID.mark(row, row.aid) } }
  if('say' === kind){ AID.mark(row, d.say) }
  if('stat' === d.kind){ AID.text(row, 'small', d.say) }
  if('tool' === d.kind){
    AID.text(row, 'b', d.name); AID.text(row, 'pre', d.say);
    row.tag('live', d.done ? -1 : 1); row.tag('done', d.done ? 1 : -1); row.tag('bad', d.bad ? 1 : -1);
  }
  if('plan' === d.kind){ AID.plan(row, d.plan) }
  if('ask' === d.kind){ AID.ask(row, d) }
  if('diff' === d.kind){ AID.text(row, 'pre', d.say) }
  if('done' === d.kind){ AID.text(row, 'small', d.say); AID.bar.all('.stop')[0].tag('hide', 1) }
  if('fail' === d.kind){ AID.text(row, 'pre', d.say); AID.bar.all('.stop')[0].tag('hide', 1) }
};

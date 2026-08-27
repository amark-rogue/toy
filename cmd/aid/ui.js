// User actions return through the same event boundary as the live stream.

AID.box.ear('click', function(eve){
  var but = eve.target.closest('.picks button'), row; if(!but){ return }
  row = but.closest('.ask'); kit.say({id:row.dataset.id, job:AID.job, say:but.value}, 'aid.ok'); row.remove();
});
AID.box.ear('submit', function(eve){
  eve.preventDefault(); var row = eve.target.closest('.ask'), val = row.all('input')[0].value;
  if(!val){ return } kit.say({id:row.dataset.id, job:AID.job, say:val}, 'aid.ok'); row.remove();
});
AID.bar.all('.stop')[0].ear('click', function(){ kit.say({job:AID.job}, 'aid.stop'); this.tag('hide', 1) });
kit.ear('aid', function(eve){
  var d = eve.detail || eve.data || {}, key = (d['#'] || '') + ':' + (d.n || '');
  if(!d.kind || AID.seen[key]){ return } AID.seen[key] = 1; AID.draw(d);
});

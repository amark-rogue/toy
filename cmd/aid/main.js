// Finite component entry after the UI and optional host transport exist.

kit.createServer(function(req, res){
  if(aid.host.take(req.body)){ res.send(document); return }
  if(aid.host.miss(req.body)){ res.send(document); aid.host.open(req.body); return }
  AID.host(req.body); res.send(document);
});

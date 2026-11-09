// Lifo richer-shell backend (blocked until Worker isolation + pinned CDN graph).
//
// Why this refuses to boot:
// 1) @lifo-sh/core runs guest JS with eval/new Function in the current realm.
//    Nodepod runs guest work in Web Workers. A same-origin Lifo swap would let
//    node/npm guest code touch the page DOM, kit, and ambient page state.
// 2) Lifo's published npm/esm graphs are not a single immutable SRI-pinnable
//    browser entry the way Nodepod's dist modules are (jsDelivr +esm forbids SRI;
//    bare imports need a dependency-complete static graph). Toy must not vendor
//    a rebuilt bundle into the tree.
// 3) Benchmark gaps remain: no symlinks, broken for-loops, non-isolated vm,
//    local npm install that exits 0 without a requireable package.
//
// Safe future shape: a Worker-hosted Lifo Sandbox with message-pass FS/TTY,
// OPFS sync still owned by pod.seed/pod.copy (separate in-memory VFS namespace;
// switching engines does not migrate Nodepod's volume), and a CDN+SRI pin list
// for a static dependency-complete build. Until then keep pod.via = 'nodepod'.

;(function(pod){

pod.lifo = pod.lifo || {};

pod.lifo.why = 'lifo: richer shell blocked — guest code would run in the page realm without Nodepod-class Worker isolation, and Lifo has no SRI-pinned static browser graph yet';

pod.lifo.cdn = function(){
  return Promise.reject(Error(pod.lifo.why));
};

pod.lifo.prep = function(){
  return Promise.reject(Error(pod.lifo.why));
};

}(demo.pod));

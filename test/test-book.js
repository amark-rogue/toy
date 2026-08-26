const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

var ctx = {unescape: unescape, encodeURIComponent: encodeURIComponent, module: {exports: {}}, console: console};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('cmd/book.js', 'utf8'), ctx, {filename: 'cmd/book.js'});
var book = ctx.module.exports;

// plain lines never look booked
assert.strictEqual(book.cut('hello udp'), null);
assert.strictEqual(book.cut(''), null);

// no options: exactly one byte of header
var wire = book.head('hello udp');
assert.strictEqual(wire.length, 'hello udp'.length + 1, 'bare booking costs one byte');
assert.strictEqual(book.cut(wire).msg, 'hello udp');

// sum: fixed six chars, dedup id, survives round trip
wire = book.head('hello udp', {sum: 1});
var cut = book.cut(wire);
assert.strictEqual(cut.sum.length, 6, 'sum is six chars');
assert.strictEqual(cut.msg, 'hello udp');
assert.strictEqual(cut.sum, book('hello udp'), 'same msg, same book');
assert.notStrictEqual(book('hello udp'), book('hello upd'), 'one bit flip, new book');

// seq orders; more marks concat after me
cut = book.cut(book.head('part one', {seq: 41, more: 1}));
assert.strictEqual(cut.seq, 41);
assert.strictEqual(cut.more, true);
assert.strictEqual(cut.msg, 'part one');
assert.strictEqual(book.cut(book.head('x', {seq: 0})).seq, 0, 'zero seq is kept');

// key filters fanout before payload read; junk in keys is stripped, not kept
cut = book.cut(book.head('hi', {key: 'gun'}));
assert.strictEqual(cut.key, 'gun');
assert.strictEqual(book.cut(book.head('hi', {key: 'gu n'})).key, 'gun', 'head strips non word chars from keys');
assert.strictEqual(book.cut(book.head('hi', {key: 'a\x1fb'})).key, 'ab', 'no forged frame edges');

// zip slot carries algo char plus original size
cut = book.cut(book.head('zzz', {zip: 'd', size: 900}));
assert.strictEqual(cut.zip, 'd');
assert.strictEqual(cut.size, 900);

// everything at once, and utf8 payloads stay whole
var big = 'héllo ✅ wörld — ünïcode ✓';
wire = book.head(big, {sum: 1, seq: 7, key: 'toy', more: 1});
cut = book.cut(wire);
assert.strictEqual(cut.msg, big, 'utf8 payload intact');
assert.strictEqual(cut.key, 'toy');
assert.strictEqual(cut.seq, 7);
assert.strictEqual(cut.more, true);
assert.strictEqual(cut.sum, book(big));

// header is smaller than the fields it carries on typical small packets
var fat = book.head('ok', {sum: 1, seq: 3});
assert(fat.length <= 'ok'.length + 10, 'header stays tiny');

console.log('PASS book wire, dedup, order, keys, zip slot');

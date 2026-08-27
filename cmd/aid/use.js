// Shared tool helpers.

;(function(){
aid.cap = function(text, size){
  text = '' + (null == text ? '' : text); size = size || 12000;
  return text.length > size ? text.slice(0, size) + '\n...(cut ' + (text.length - size) + ' chars)' : text;
};
aid.use = aid.use || {};
}());

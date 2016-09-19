/*jslint indent: 2, maxlen: 80, continue: false, unparam: false, node: true */
/* -*- tab-width: 2 -*- */
'use strict';

var CF, PT, xad = require('./xmlattrdict.js'),
  objerr = require('generic-object-error');

CF = function XmlTag(srcText) {
  if ((typeof srcText) !== 'string') {
    throw new Error('expected srcText to be a non-empty string');
  }
  if (srcText[0] !== '<') { srcText = '<' + srcText + '>'; }
  var opts = { attribRawValues: {} }, attrs = xad.tag2dict(srcText, opts);
  this.tagName = xad.popAttr(attrs, '', '');
  this.attrs = attrs;
  this.rawAttrs = opts.attribRawValues;
};
PT = CF.prototype;

Object.assign(PT, objerr.proto);


CF.peekTag = function (spBuf, args) {
  // glue for package "string-peeks"
  args = Array.prototype.slice.call(arguments, 1);
  var tag = spBuf.peekTag.apply(spBuf, args);
  if (tag) {
    tag = new CF(tag.input);
    if (spBuf.calcPosLnChar) { tag.srcPos = spBuf.calcPosLnChar(); }
  }
  return tag;
};


PT.toString = function () {
  var attr = xad.fmtAttrXml_dk.bind(null, this.attrs);
  return '[xmlattrdict.XmlTag <'.concat(this.tagName, '>',
    attr('id', ' '),
    attr('name', ' '),
    attr('class', ' '),
    attr('type', ' '),
    attr('role', ' '),
    ']');
};

PT.popAttr = function popAttr(key, dflt) {
  return xad.popAttr(this.attrs, key, dflt);
};

PT.popReqAttr = function (attr, emptyOk) {
  var val = this.popAttr(attr);
  switch (emptyOk) {
  case '':
    if (val === '') { return val; }
    break;
  case true:
    if (val === true) { return val; }
    if (val === '') { return val; }
    break;
  }
  if ((val && typeof val) === 'string') { return val; }
  throw new Error(String(this) + ': missing attribute: ' + attr);
};













module.exports = CF;

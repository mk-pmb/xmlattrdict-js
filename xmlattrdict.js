/*jslint indent: 2, maxlen: 80, continue: false, unparam: false, node: true */
/* -*- tab-width: 2 -*- */
'use strict';

var EX, rxu = require('rxu'), xmlEsc = require('xmlunidefuse'),
  xmldecode = require('xmldecode');

EX = function xmlattrdict(input, opts) {
  switch (input && typeof input) {
  case 'string':
    return EX.tag2dict(input, opts);
  case 'object':
    return EX.dict2tag(input, opts);
  }
  throw new Error('Expected input to be a string or an object.');
};


EX.attrNameRgx = /([A-Za-z][A-Za-z0-9_:\+\-]*)/;
EX.eqSignValue = rxu.join(['(=(?:',
  /"([\x00-!#-\uFFFF]*)"|/,
  /'([\x00-&\x28-\uFFFF]*)'|/,
  /([!#-&\x28;=@-\uFFFF]*)/,
  ')|)']);
EX.nextAttrRgx = rxu.join([/^[\x00- ]*/, EX.attrNameRgx, EX.eqSignValue]);


EX.tag2dict = function (tag, opts) {
  var attrs, addAttr;
  tag = String(tag);
  opts = (opts || false);
  attrs = (opts.destObj || Object.create(null));

  addAttr = function (rawName, rawValue) {
    var textValue = rawValue;
    if ((typeof rawValue) === 'string') { textValue = xmldecode(rawValue); }
    attrs[rawName] = textValue;
    if (!addAttr.wantRaw) { return; }
    if (addAttr.wantRaw === true) {
      attrs[rawName] = rawValue;
      return;
    }
    addAttr.wantRaw[rawName] = rawValue;
  };
  addAttr.wantRaw = (opts.attribRawValues || false);

  rxu.ifMatch(tag, /(?:(\/)|\?|)>?[\s\n]*$/, function trailingSlash(sl) {
    tag = tag.substr(0, sl.index);
    if (sl[1]) { attrs[sl[1]] = true; }
  });

  rxu.ifMatch(tag, /^<(\S+)\s*/, function tagName(tn) {
    tag = tag.substr(tn[0].length);
    attrs[''] = tn[1];
  });

  addAttr.found = function (m) {
    addAttr(m[1], (m[2] ? (m[3] || m[4] || m[5]) : true));
    tag = tag.slice(m[0].length).replace(/^\s+/, '');
  };
  addAttr.remainder = function () {
    if (!opts.remainderAttr) {
      throw new Error('unexpected remaining tag content: ' + tag);
    }
    attrs[opts.remainderAttr] = tag;
    tag = '';
  };

  while (tag) {
    rxu.ifMatch(tag, EX.nextAttrRgx, addAttr.found, addAttr.remainder);
  }
  return attrs;
};


EX.dict2tag = function (dict) {
  if (arguments.length > 1) { dict = Object.assign.apply({}, arguments); }
  var tag = (dict[''] ? '<' + dict[''] : ''), badKeys = [];

  Object.keys(dict).sort().forEach(function (key, val) {
    if (key === '') { return; }
    if (rxu.m(key, EX.attrNameRgx)[0] !== key) { return badKeys.push(key); }
    tag = (tag && ' ');
    val = dict[key];
    if (val === undefined) { return; }
    if (val === null) { return; }
    tag += '="' + xmlEsc(val) + '"';
  });

  if (badKeys.length) {
    tag += '><!-- bad keys: "' + badKeys.map(xmlEsc).join('", "');
  }

  return tag;
};
















module.exports = EX;

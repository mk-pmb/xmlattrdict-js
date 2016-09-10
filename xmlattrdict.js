/*jslint indent: 2, maxlen: 80, continue: false, unparam: false, node: true */
/* -*- tab-width: 2 -*- */
'use strict';

var EX, rxu = require('rxu'), xmlEsc = require('xmlunidefuse'),
  xmldecode = require('xmldecode'),
  hasOwn = Function.call.bind(Object.prototype.hasOwnProperty);

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
  /([\!\#-\&\x28-;=@-\uFFFF]*)/,
  ')|)']);
EX.nextAttrRgx = rxu.join([/^[\x00- ]*/, EX.attrNameRgx, EX.eqSignValue]);


EX.tag2dict = function (tag, opts) {
  var attrs, addAttr;
  tag = String(tag);
  opts = (opts || false);
  attrs = opts.destObj;
  attrs = (attrs || (attrs === null ? Object.create(null) : {}));

  addAttr = function (rawName, rawValue) {
    var textValue = rawValue;
    if ((typeof rawValue) === 'string') { textValue = xmldecode(rawValue); }
    if (addAttr.wantRaw === true) {
      return addAttr.addOrMulti(attrs, rawName, rawValue);
    }
    addAttr.addOrMulti(attrs, rawName, textValue);
    if (!addAttr.wantRaw) { return; }
    addAttr.addOrMulti(addAttr.wantRaw, rawName, rawValue);
  };
  addAttr.wantRaw = (opts.attribRawValues || false);
  addAttr.addOrMulti = function (dict, key, newVal) {
    if (hasOwn(dict, key)) { newVal = addAttr.multi(dict[key], newVal); }
    dict[key] = newVal;
  };
  addAttr.multi = EX.makeValueMerger(opts.multi);

  rxu.ifMatch(tag, /(?:(\/)|\?|)>?[\s\n]*$/, function trailingSlash(sl) {
    tag = tag.substr(0, sl.index);
    if (sl[1]) {
      addAttr.end = sl[1];
      // defer in order to get prettier console.dir
    }
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
    attrs[' '] = tag;
    tag = '';
  };

  while (tag) {
    rxu.ifMatch(tag, EX.nextAttrRgx, addAttr.found, addAttr.remainder);
  }
  if (addAttr.end) { attrs['>'] = addAttr.end; }
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


EX.makeValueMerger = function (strategy) {
  switch (strategy && typeof strategy) {
  case 0:
  case false:
    return function (old) { return old; };
  case 'string':
    return function (o, n) { return (o + strategy + n); };
  case 'function':
    return strategy;
  case undefined:
  case null:
  case 'boolean':
    return function (o, n) { return [].concat(o, n); };
  }
  throw new Error('Unsupported merge strategy: ' + String(strategy));
};

















module.exports = EX;

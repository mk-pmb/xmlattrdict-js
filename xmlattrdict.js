﻿/*jslint indent: 2, maxlen: 80, continue: false, unparam: false, node: true */
/* -*- tab-width: 2 -*- */
'use strict';

var EX, rxu = require('rxu'),
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

EX.xmldec = require('xmldecode');
EX.xmlesc = require('xmlunidefuse');


EX.popAttr = function popAttr(dict, key, dflt) {
  if (arguments.length === 1) { return popAttr.bind(null, dict); }
  var val;
  if ((key && typeof key) === 'object') {
    if (Array.isArray(key)) {
      val = {};
      key.map(function (k) { val[k] = popAttr(dict, k, dflt); });
      return val;
    }
    Object.keys(key).map(function (k) { key[k] = popAttr(dict, k, dflt); });
    return key;
  }
  val = dict[key];
  if (val === undefined) { val = dflt; }
  delete dict[key];
  return val;
};


function lsep(v, s) { return (v ? s + v : v); }
function ltrim(s) { return String(s).replace(/^\s+/, ''); }


EX.tagStartRgx = /<([!-;=\?-\uFFFF]+)(?:\s+|\/|$)/;
EX.tagStartRgx.at0 = rxu.join(['^', EX.tagStartRgx]);
EX.attrNameRgx = /([A-Za-z][A-Za-z0-9_:\+\-]*)/;
EX.eqSignValue = rxu.join(['(=(?:',
  /"([\x00-!#-\uFFFF]*)"|/,
  /'([\x00-&\x28-\uFFFF]*)'|/,
  /([\!\#-\&\x28-;=@-\uFFFF]*)/,
  ')|)']);
EX.nextAttrRgx = rxu.join([/^[\x00- ]*/, EX.attrNameRgx, EX.eqSignValue]);

EX.tagRgx = (function () {
  var tag = rxu.body(rxu.join([/\s*/, EX.tagStartRgx, '(?:',
    /[\x00-!#-&\(-=\?-Z\\-\uFFFF]+/, '|',
    EX.eqSignValue, '|',
    /\[(?:<$subtag>)*\s*\]/,
    ')+>']));
  tag = tag.replace(/<\$subtag>/g, tag);
  tag = tag.replace(/<\$subtag>/g, '\\s*');
  tag = Object.assign(new RegExp(tag, ''), { at0: new RegExp('^' + tag, '') });
  return tag;
}());


EX.tag2dict = function (tag, opts) {
  var attrs, addAttr, attrOrder;
  tag = String(tag);
  opts = (opts || false);
  attrs = opts.destObj;
  attrs = (attrs || (attrs === null ? Object.create(null) : {}));

  addAttr = function (rawName, rawValue) {
    var textValue = rawValue;
    if (attrOrder) { attrOrder.push(rawName); }
    if ((typeof rawValue) === 'string') { textValue = EX.xmldec(rawValue); }
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

  rxu.ifMatch(tag, /(?:(\/)|\?|)>?\s*$/, function trailingSlash(sl) {
    tag = tag.substr(0, sl.index);
    if (sl[1]) {
      addAttr.tail = sl[1];
      // defer in order to get prettier console.dir
    }
  });

  rxu.ifMatch(tag, EX.tagStartRgx.at0, function tagName(tn) {
    tag = tag.substr(tn[0].length);
    attrs[''] = tn[1];
  });

  attrOrder = opts.attrOrder;
  if (attrOrder) {
    if (!Array.isArray(attrOrder)) {
      attrOrder = attrs[attrOrder] = [];
    }
  }

  addAttr.found = function (m) {
    addAttr(m[1], (m[2] ? (m[3] || m[4] || m[5] || '') : true));
    tag = tag.slice(m[0].length).replace(/^\s+/, '');
  };
  addAttr.remainder = function () {
    if ((tag[0] === '[')  && addAttr.doctypeSubTag()) { return; }
    addAttr(' ', tag);
    tag = '';
  };
  addAttr.doctypeSubTag = function () {
    var subTags = EX.eatDoctypeSubTags(tag.slice(1));
    if (!subTags) { return false; }
    tag = subTags.remainder;
    attrs['[]'] = (attrs['[]'] || []).concat(subTags);
    return true;
  };

  while (tag) {
    rxu.ifMatch(tag, EX.nextAttrRgx, addAttr.found, addAttr.remainder);
  }
  switch (addAttr.tail || '') {
  case '':
    break;
  case '/':
    attrs[addAttr.tail] = true;
    break;
  default:
    attrs['>'] = addAttr.tail;
  }
  return attrs;
};


EX.eatDoctypeSubTags = function (remainder) {
  var subTags = [];
  while (true) {
    remainder = remainder.replace(/^\s+/, '');
    if (remainder[0] === ']') {
      subTags.remainder = remainder.replace(/^\]\s*/, '');
      return subTags;
    }
    if (!rxu(EX.tagRgx.at0, remainder)) {
      console.log({ noTag: remainder, tagAt0: EX.tagRgx.at0 });
      return false;
    }
    remainder = rxu('>');
    subTags.push(rxu(0));
  }
  return false;
};


EX.dict2tag = function (dict, opts) {
  dict = Object.assign({}, dict);   // make a copy so we can safely popAttr()
  if (arguments.length > 2) {
    Object.assign.apply(dict, Array.prototype.slice.call(arguments, 2));
  }
  var dpop = EX.popAttr(dict), tagName = dpop('', ''), badKeys = [],
    attrs = lsep(tagName, '<'),
    tail = lsep(dpop(' ', ''), ' ') + dpop('>', '');
  if (dpop('/')) { tail += ' /'; }

  opts = (opts || false);
  badKeys.strategy = (function (bkOpt) {
    switch (bkOpt) {
    case 'accept':
      badKeys.push = false;
      return;
    case undefined:
    case 'error':
      return EX.quotedList.bind(null, badKeys, { throwReason: 'bad keys' });
    case 'comment':
      return function () {
        attrs += '<!-- bad keys: ' + EX.quotedList(badKeys) + ' -->';
      };
    }
    if (bkOpt) {
      if (Array.isArray(bkOpt)) {
        badKeys.push = badKeys.strategy.push.bind(badKeys.strategy);
        badKeys.strategy = undefined;
        return;
      }
    }
    throw new Error('unsupported badKeys strategy: ' + String(bkOpt));
  }(opts.badKeys));

  Object.keys(dict).sort().forEach(function (key) {
    if (badKeys.push && (rxu(EX.attrNameRgx, key)[0] !== key)) {
      return badKeys.push(key);
    }
    attrs += (attrs && ' ') + EX.fmtAttrXml_dk(dict, key);
  });
  attrs += tail;
  if (tagName) { attrs += '>'; }
  if (badKeys.length && badKeys.strategy) {
    badKeys = badKeys.strategy(badKeys, attrs);
    if ((typeof badKeys) === 'string') { return badKeys; }
  }
  return attrs;
};


EX.fmtAttrXml_dk = function fmtAttrXml(dict, key, prefix, suffix) {
  var val = dict[key];
  if (val === undefined) { return ''; }
  if (val === null) { return key; }
  if (val === true) { return key; }
  return ((prefix || '') + key + '="' + EX.xmlesc(val) + '"' + (suffix || ''));
};


EX.quotedList = function (arr, opts) {
  opts = (opts || false);
  arr = (opts.prefix || '') + '"' + arr.map(EX.xmlesc).join('", "') + '"' +
    (opts.suffix || '');
  if (opts.throwReason) { throw new Error(opts.throwReason + ': ' + arr); }
  return arr;
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

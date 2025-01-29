/*jslint indent: 2, maxlen: 80, continue: false, unparam: false, node: true */
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


function wrapInObj(k, v, a) {
  var o = {};
  if (a) { Object.assign(o, a); }
  o[k] = v;
  return o;
}


function refine(f, x) {
  var y = f(x);
  return (y === undefined ? x : y);
}


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


function lsep(v, s) { return (v && (s + v)); }
function ltrim(s) { return String(s).replace(/^\s+/, ''); }


EX.openingTagStartRgx = /<([!-;=\?-\uFFFF]+)(?:\s+|\/|$)/;
EX.openingTagStartRgx.at0 = rxu.join(['^', EX.openingTagStartRgx]);
EX.attrNameRgx = /([A-Za-z][A-Za-z0-9_:\+\-]*)/;
EX.eqSignValue = rxu.join(['(=(?:',
  /"([\x00-!#-\uFFFF]*)"|/,
  /'([\x00-&\x28-\uFFFF]*)'|/,
  /([\!\#-\&\x28-;=@-\uFFFF]*)/,
  ')|)']);
EX.nextAttrRgx = rxu.join([/^[\x00- ]*/, EX.attrNameRgx, EX.eqSignValue]);

EX.allTagsRgx = /<(?:\/?[\w:]+)(?:\s[\s -;=\?-\uFFFF]*|)(?:>|$)/g;
EX.allTagsRgx.upNext = rxu.join(['(?=', EX.allTagsRgx, ')']);
EX.allTagsRgx.capture = rxu.join(['(', EX.allTagsRgx, ')'], 'g');

EX.tagRgx = (function () {
  var tag = rxu.body(rxu.join([/\s*/, EX.openingTagStartRgx, '(?:',
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
  opts = (opts || false);
  attrs = opts.destObj;
  attrs = (attrs || (attrs === null ? Object.create(null) : {}));
  if (opts.verbatim) { attrs[opts.verbatim] = tag; }
  tag = String(tag);

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

  rxu.ifMatch(tag, /(?:(\/)|\?|)\s*($|>(?![\S\s]*[<>]))/, function f(sl) {
    addAttr.after = tag.slice(sl.index + sl[0].length);
    tag = tag.slice(0, sl.index);
    if (sl[1]) {
      addAttr.tail = sl[1];
      // defer in order to get prettier console.dir
    }
  });

  rxu.ifMatch(tag, EX.openingTagStartRgx.at0, function tagName(tn) {
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
  if (addAttr.after) { attrs['…'] = addAttr.after; }
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
    innerText = dpop('¶', ''), innerXML = dpop('|', ''),
    tail = lsep(dpop(' ', ''), ' ') + dpop('>', ''),
    after = dpop('…', '');
  if (dpop('/')) { tail += ' /'; }
  opts = (opts || false);
  if (opts.verbatim) { dpop(opts.verbatim); }
  if (opts.ignoreKeys) { opts.ignoreKeys.forEach(dpop); }

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
  if (tagName && (innerText || innerXML)) {
    attrs += EX.xmlesc(innerText) + innerXML + '</' + tagName + '>';
  }
  attrs += after;
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


EX.splitXml = function splitXml(doc, opts) {
  if (!opts) { return splitXml(doc, true); }
  var pos, after,
    wrapTextsKey = opts.wrapTexts, doWrapTexts,
    textAttrs = opts.textAttrs,
    textTag = opts.textTagName,
    onText = opts.onText, onTag = opts.onTag,
    parts = opts.onto;
  if (textTag) { textAttrs = Object.assign({ '': textTag }, textAttrs); }
  if (wrapTextsKey === undefined) { wrapTextsKey = '…'; }
  if (textAttrs && (wrapTextsKey === false)) { wrapTextsKey = '…'; }
  doWrapTexts = (wrapTextsKey !== false);
  if ((!parts) && (parts !== null)) { parts = []; }

  function addTextPart(m) {
    if (!m) { return; }
    if (doWrapTexts) { m = wrapInObj(wrapTextsKey, m, textAttrs); }
    if (onText) { m = refine(onText, m); }
    if (parts) { parts.push(m); }
  }

  doc.split(EX.allTagsRgx.upNext).forEach(function f(m) {
    if (!m) { return; }
    if (m.slice(0, 1) !== '<') { return addTextPart(m); }
    pos = m.indexOf('>');
    if (pos < 0) {
      after = '';
    } else {
      after = m.slice(pos + 1);
      m = m.slice(0, pos + 1);
    }
    m = EX.tag2dict(m, opts);
    if (onTag) { m = refine(onTag, m); }
    if (parts) { parts.push(m); }
    if (after) { addTextPart(after); }
  });
  return parts;
};


EX.compileXml = function compileXml(parts, opts) {
  if (!opts) { return compileXml(parts, true); }
  var xml = '', onDict = opts.onDict, onTag = opts.onTag, onText = opts.onText;
  parts.forEach(function append(p) {
    if (!p) { return; }
    if (typeof p === 'object') {
      if (onDict) { p = refine(onDict, p); }
      p = EX.dict2tag(p);
      if (onTag) { p = refine(onTag, p); }
    } else {
      if (onText) { p = refine(onText, p); }
    }
    xml += p;
  });
  return xml;
};


















module.exports = EX;

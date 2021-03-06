﻿
<!--#echo json="package.json" key="name" underline="=" -->
xmlattrdict
===========
<!--/#echo -->

<!--#echo json="package.json" key="description" -->
Parse XML tag attributes into a dictionary object, or build a tag from an
object.
<!--/#echo -->


Usage
-----
from [test.js](test.js):
<!--#include file="test.js" start="/*** BEGIN readme ***/"
  stop="/*** ENDOF readme ***/" code="javascript" -->
<!--#verbatim lncnt="131" -->
```javascript
var xmlAttrDict = require('xmlattrdict'), input, result,
  assert = require('assert');
function expect(x) { assert.deepStrictEqual(result, x); }

//##########\\ tag -> dict //#############################################\\

result = xmlAttrDict('<?xml version="1.0"?>');
expect({ '': '?xml', version: '1.0' });     // final "?" is ignored

result = xmlAttrDict("<!-- I'm a comm&amp; -->");
expect({ '': '!--', I: true, ' ': "'m a comm& --" });

result = xmlAttrDict('<ubuntu ver="14.04"   lts name="tr&#x75;st&#121;"    />');
expect({ '': 'ubuntu', ver: '14.04', lts: true, name: 'trusty', '/': true });

result = xmlAttrDict('</closing tag empty-attr="" >');
expect({ '': '/closing', tag: true, 'empty-attr': '' });

//===== repeating attribute names =====

input = '<phones line=23 line=42 line=hold>';
result = xmlAttrDict(input);
expect({ '': 'phones', line: [ '23', '42', 'hold' ] });

result = xmlAttrDict(input, { multi: true });
expect({ '': 'phones', line: [ '23', '42', 'hold' ] });

result = xmlAttrDict(input, { multi: false });
expect({ '': 'phones', line: '23' });

result = xmlAttrDict(input, { multi: '\n' });
expect({ '': 'phones', line: '23\n42\nhold' });

result = throw2string(xmlAttrDict)(input, { multi: 2 });
expect('Error: Unsupported merge strategy: 2');

function prepend(a, b) { return b + a; }
result = xmlAttrDict(input, { multi: prepend });
expect({ '': 'phones', line: 'hold4223' });

//===== capture attribute order =====

input = '<toast bread cheese="cheddar" ham salad tomato cheese="gouda" ' +
  'tomato salad bread>';
result = xmlAttrDict(input, { attrOrder: '#' });
expect({ '': 'toast',
  '#': ['bread', 'cheese', 'ham', 'salad', 'tomato', 'cheese', 'tomato',
    'salad', 'bread'],
  bread: [true, true], cheese: ['cheddar', 'gouda'], ham: true,
  salad: [true, true], tomato: [true, true] });

result = ['add them here'];
xmlAttrDict(input, { attrOrder: result });
expect(['add them here', 'bread', 'cheese', 'ham', 'salad', 'tomato',
  'cheese', 'tomato', 'salad', 'bread']);

//===== extra non-attribute text =====

result = xmlAttrDict('</closing withSlash/>');
expect({ '': '/closing', withSlash: true, '/': true });

result = xmlAttrDict('</closing withSpaceSlash />');
expect({ '': '/closing', withSpaceSlash: true, '/': true });

//##########\\ dict -> tag //#############################################\\

result = xmlAttrDict({ '': '!DOCTYPE', ' ': 'html' });
expect('<!DOCTYPE html>');

result = xmlAttrDict({ '': '!DOCTYPE', html: true });
expect('<!DOCTYPE html>');

result = xmlAttrDict({ '': '!DOCTYPE', html: null });
expect('<!DOCTYPE html>');

result = xmlAttrDict({ '': '!--', thisIs: true, a: null, comment: true,
  '>': ' --' });
expect('<!-- a comment thisIs -->');

result = xmlAttrDict({ '': '!--', ' ': 'thisIs a comment', '>': ' --' });
expect('<!-- thisIs a comment -->');

result = xmlAttrDict({ '': '!--', ' ': 'thisIs a comment --' });
expect('<!-- thisIs a comment -->');

result = xmlAttrDict({ '': 'meta', 'http-equiv': 'Content-Type',
  content: 'text/html' });
expect('<meta content="text/html" http-equiv="Content-Type">');

result = xmlAttrDict({ '': 'msg', text: '&Hel​lo s\n<o>wman! ☃' });
expect('<msg text="&amp;Hel&#x200B;lo&#xA0;s&#10;&lt;o&gt;wman!&#x205F;☃">');

//===== additional verbatim text and tail =====

result = xmlAttrDict({ '': 'hr', size: 1 });
expect('<hr size="1">');

result = xmlAttrDict({ '': 'hr', size: 1, '>': '/' });
expect('<hr size="1"/>');

result = xmlAttrDict({ '': 'hr', size: 1, ' ': '/' });
expect('<hr size="1" />');  // <-- space --^

result = xmlAttrDict({ '': 'hr', size: 1, '/': true });
expect('<hr size="1" />');

result = xmlAttrDict({ '': 'hr', size: 1, ' ': 'verba<?php foo(); ?>tim' });
expect('<hr size="1" verba<?php foo(); ?>tim>');

result = xmlAttrDict({ '': 'hr', size: 1, '>': '&tail;' });
expect('<hr size="1"&tail;>');

result = xmlAttrDict({ '': 'hr', size: 1, '>': '&tail', ' ': 'ver<b>atim' });
expect('<hr size="1" ver<b>atim&tail>');

//===== invalid attribute names =====

input = { '': '\r', '\n': 'nl', '\t': 'tab', '=': 'eq', '?': 'qm', ' ': 'sp' };
result = throw2string(xmlAttrDict)(input);
expect('Error: bad keys: "&#9;", "&#10;", "=", "?"');

result = throw2string(xmlAttrDict)(input, { badKeys: 'error' });
expect('Error: bad keys: "&#9;", "&#10;", "=", "?"');

result = xmlAttrDict(input, { badKeys: 'accept' });
expect('<\r \t="tab" \n="nl" =="eq" ?="qm" sp>');

result = xmlAttrDict(input, { badKeys: 'comment' });
expect('<\r sp><!-- bad keys: "&#9;", "&#10;", "=", "?" -->');
```
<!--#toc stop="scan" -->


License
-------
<!--#echo json="package.json" key=".license" -->
ISC
<!--/#echo -->

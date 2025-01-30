/*jslint indent: 2, maxlen: 80, node: true */
/* -*- tab-width: 2 -*- */
'use strict';

function throw2string(func) {
  return function () {
    try {
      return func.apply(this, arguments);
    } catch (err) {
      return String(err);
    }
  };
}


/*** BEGIN readme ***/
var xmlAttrDict = require('xmlattrdict'), input, result,
  assert = require('assert');
function expect(x) { assert.deepStrictEqual(result, x); }

//##########\\ tag -> dict //#############################################\\

result = xmlAttrDict('<?xml version="1.0"?>');
expect({ '': '?xml', version: '1.0' });     // final "?" is ignored

result = xmlAttrDict("<!-- I'm a comm&amp; -->");
expect({ '': '!--', I: true, ' ': "'m a comm& --" });

result = xmlAttrDict('<hr>');     // v0.1.12 failed to detect tagname
expect({ '': 'hr' });             //    if no attributes were given

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

//===== Tags with angle brackets inside them =====

input = ('<!DOCTYPE screw-basic-parsers ['
  + '\n  <!ELEMENT p (#PCDATA)>'
  + '\n  ]>');
result = xmlAttrDict(input);
expect({ '': '!DOCTYPE',
  'screw-basic-parsers': true,
  '[]': [ '<!ELEMENT p (#PCDATA)>' ] });

//##########\\ dict -> tag //#############################################\\

result = xmlAttrDict({ '': '!DOCTYPE', ' ': 'html' });
expect('<!DOCTYPE html>');

result = xmlAttrDict({ '': '!DOCTYPE', html: true });
expect('<!DOCTYPE html>');

result = xmlAttrDict({ '': '!DOCTYPE', html: null });
expect('<!DOCTYPE html>');

input = { '': 'order', a: [10, 1], z: 26, y: 25, c: 3, x: 24, b: 2 };
result = xmlAttrDict(input);
expect('<order a="10" a="1" b="2" c="3" x="24" y="25" z="26">');
result = xmlAttrDict(input, { attrOrder: false });
expect('<order a="10" a="1" z="26" y="25" c="3" x="24" b="2">');
result = xmlAttrDict(input, { attrOrder: ['c', 'a', 'z', 'A', 'c', 'a'] });
expect('<order c="3" a="10" a="1" z="26" b="2" x="24" y="25">');

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

//===== convenience attributes =====

// innerText (¶) and innerXML (|):
result = xmlAttrDict({ '': 'em', 'class': 'marked', '…': '<sup>[1]</sup>',
  '¶': 'Typo: The "<" should have been a ">".',
  '|': '<a id="typo1" name="typo1"></a>' });
expect('<em class="marked">'
  + 'Typo: The &quot;&lt;&quot; should have been a &quot;&gt;&quot;.'
  + '<a id="typo1" name="typo1"></a>'
  + '</em><sup>[1]</sup>');

//##########\\ document -> list //########################################\\

input = '<li><a href="#"><img src=home.png> Back to<br />Homepage</a></li>';
result = xmlAttrDict.splitXml(input);
expect([
  { '': 'li' },
  { '': 'a', href: '#' },
  { '': 'img', src: 'home.png' },
  { '…': ' Back to' },
  { '': 'br', '/': true },
  { '…': 'Homepage' },
  { '': '/a' },
  { '': '/li' },
]);

input = 'Be <b>bold!</b>'; // Document fragment can start with text.
result = xmlAttrDict.splitXml(input);
expect([{ '…': 'Be ' }, { '': 'b' }, { '…': 'bold!' }, { '': '/b' }]);

result = xmlAttrDict.splitXml(input, { wrapTexts: '=' });
expect([{ '=': 'Be ' }, { '': 'b' }, { '=': 'bold!' }, { '': '/b' }]);

result = xmlAttrDict.splitXml(input, { wrapTexts: '' }); // ambiguous!
expect([{ '': 'Be ' }, { '': 'b' }, { '': 'bold!' }, { '': '/b' }]);

result = xmlAttrDict.splitXml(input, { wrapTexts: false });
expect(['Be ', { '': 'b' }, 'bold!', { '': '/b' }]);

result = xmlAttrDict.splitXml(input, { textTagName: '=' });
expect([{ '': '=', '…': 'Be ' },
  { '': 'b' }, { '': '=', '…': 'bold!' }, { '': '/b' }]);

result = xmlAttrDict.splitXml(input, { wrapTexts: 'v', textTagName: 4 });
expect([{ '': 4, v: 'Be ' },
  { '': 'b' }, { '': 4, v: 'bold!' }, { '': '/b' }]);



//##########\\ list -> document //########################################\\

input = [
  { '': 'object', width: 50, height: 30 },
  { '': 'param', name: 'movie', value: 'main.swf' },
  { '': 'embed', src: 'main.swf', width: 50, height: 30 },
  'Please install ',
  { '…': 'and enable ' },
  { '': '', '…': 'the flash player.' },
  { '': '/embed' },
  { '': '/object' },
];
result = xmlAttrDict.compileXml(input);
expect('<object height="30" width="50">'
  + '<param name="movie" value="main.swf">'
  + '<embed height="30" src="main.swf" width="50">'
  + 'Please install and enable the flash player.'
  + '</embed></object>');



/*** ENDOF readme ***/

















console.log('+OK all tests passed');

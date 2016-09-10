/*jslint indent: 2, maxlen: 80, node: true */
/* -*- tab-width: 2 -*- */
'use strict';

var xmlAttrDict = require('xmlattrdict'), assert = require('assert'), input;

function test(v, opts, expect) {
  if (arguments.length === 2) {
    expect = opts;
    opts = undefined;
  }
  try { v = xmlAttrDict(v, opts); } catch (err) { v = String(err); }
  assert.deepStrictEqual(v, expect);
}

test('<?xml version="1.0"?>',   { '': '?xml', version: '1.0' });
test('<!-- comment -->',        { '': '!--', comment: true, ' ': '--' });

test('<ubuntu version="14.04" lts codename="trusty" />',
  { '': 'ubuntu', version: '14.04', lts: true, codename: 'trusty', '>': '/' });

input = '<phones line=23 line=42 line=hold>';
test(input,                   { '': 'phones', line: [ '23', '42', 'hold' ] });
test(input, { multi: true },  { '': 'phones', line: [ '23', '42', 'hold' ] });
test(input, { multi: false }, { '': 'phones', line: '23' });
test(input, { multi: '\n' },  { '': 'phones', line: '23\n42\nhold' });
test(input, { multi: 2 },     'Error: Unsupported merge strategy: 2');
test(input, { multi: function prepend(a, b) { return b + a; }
  }, { '': 'phones', line: 'hold4223' });

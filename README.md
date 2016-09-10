
xmlattrdict
===========
Parse XML tag attributes into a dictionary object, or build a tag from an object.


Usage
-----
```javascript
var xmlAttrDict = require('xmlattrdict'), assert = require('assert'), input;

function test(v, opts, expect) { // […]
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
```


License
-------
ISC

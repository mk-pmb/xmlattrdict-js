
xmlattrdict
===========
Parse XML tag attributes into a dictionary object, or build a tag from an object.


Usage
-----
see [doc/demo/usage.js](doc/demo/usage.js)
:TODO:

```bash
$ xmlattrdict foo
bar
```

```javascript
var xad = require('xmlattrdict'), tag,
  eq = require('assert').deepStrictEqual;

function o0(a, b, c) { return Object.assign(Object.create(null), a, b, c); }
function err(x, o) { try { return xad(x, o); } catch (e) { return String(e); } }

eq(xad('<?xml version="1.0"?>'),
  o0({ '': '?xml', version: '1.0' }));

eq(err('<!-- comment -->'),
  'Error: unexpected remaining tag content: --');

eq(xad('<!-- comment -->', { remainderAttr: '<…>' }),
  o0({ '': '!--', comment: true, '<…>': '--' }));

eq(xad('<pizza onions peppers="hot" crust="thin">'),
  o0({ '': 'pizza', onions: true, peppers: 'hot', crust: 'thin' }));
```


License
-------
ISC

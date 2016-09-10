#!/bin/bash
# -*- coding: utf-8, tab-width: 2 -*-
SELFPATH="$(readlink -m "$BASH_SOURCE"/..)"


function update_readme () {
  cd "$SELFPATH" || return $?
  local RMD=README.md
  local UPD="$RMD.upd-$$.tmp"
  sed -nre '
    : skip
      /^var /b copy
      n
    b skip
    : copy
      \|^/\*+ ENDOF readme \*+/|q
      /^function test\(/b testfunc_head
      p;n
    b copy
    : testfunc_head
      /\n\s+try/!{N;b testfunc_head}
      s~\n.*(\n\s+try)~ // […]\1~
      p;n
    b copy
    ' -- test.js | sed -nre '
    : copy
      p
      /```javascript/{
        r /dev/stdin
        b ins
      }
      n
    b copy
    : ins
      n
      /^```/b copy
    b ins
    ' -- "$RMD" >"$UPD"
  [ -s "$UPD" ] || return 3$(echo "E: empty: $UPD" >&2)
  mv -- "$UPD" "$RMD"
  git add -- "$RMD"
  git diff HEAD -- "$RMD"
  return 0
}










[ "$1" == --lib ] && return 0; update_readme "$@"; exit $?

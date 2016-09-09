#!/bin/bash
# -*- coding: utf-8, tab-width: 2 -*-
SELFPATH="$(readlink -m "$BASH_SOURCE"/..)"


function update_readme () {
  cd "$SELFPATH" || return $?
  local RMD=README.md
  local UPD="$RMD.upd-$$.tmp"
  grep -Fe 'var ' -m 1 -A 9002 -- test.js | sed -nre '
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

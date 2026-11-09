#!/bin/sh
# Overflow / a11y audit at the gate widths (dev tool). Needs the local server and Chrome on CDP_PORT.
cd "$(dirname "$0")"
A=$(cat a11y.js)
for w in 360 390 768 1024 1440 1920; do
  m=""; [ "$w" -lt 768 ] && m=mobile
  echo "== $w"
  node cdp.mjs "http://127.0.0.1:8000/idphoto/" ${w}x900 $m wait=900 "log=$A"
done

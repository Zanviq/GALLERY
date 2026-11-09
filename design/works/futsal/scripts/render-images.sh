#!/bin/sh
# Render og/futsal.png, thumbnails/futsal.webp and the PNG favicons (dev tool, not deployed).
# Needs the local server on :8000 and a headless Chrome on CDP_PORT (default 9347).
#   sh design/works/futsal/scripts/render-images.sh
set -e
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$(dirname "$0")"
B=http://127.0.0.1:8000
node cdp.mjs $B/design/works/futsal/icon.html 32x32 wait=600 shot="$ROOT/works/futsal/img/favicon-32.png"
node cdp.mjs $B/design/works/futsal/icon.html 180x180 wait=600 shot="$ROOT/works/futsal/img/apple-touch-icon.png"
node cdp.mjs $B/design/works/futsal/og.html 1200x630 wait=1500 shot="$ROOT/og/futsal.png"
# thumbnail: the real page, first screen (the recruiting-poster hero), gallery badge removed
node cdp.mjs $B/futsal/ 1200x900 wait=900 "eval=document.querySelector('[data-gallery-back]')?.remove()" wait=300 webp="$ROOT/thumbnails/futsal.webp"
ls -l "$ROOT/og/futsal.png" "$ROOT/thumbnails/futsal.webp" "$ROOT/works/futsal/img/"*.png

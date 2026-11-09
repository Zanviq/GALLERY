#!/bin/sh
# Render og/ramen.png, thumbnails/ramen.webp and the PNG favicons (dev tool, not deployed).
# Needs the local server on :8000 and a headless Chrome on CDP_PORT (default 9433).
#   sh design/works/ramen/scripts/render-images.sh
set -e
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$(dirname "$0")"
B=http://127.0.0.1:8000
W="$(cygpath -m "$ROOT" 2>/dev/null || echo "$ROOT")"
node cdp.mjs $B/design/works/ramen/icon.html 32x32 wait=600 shot="$W/works/ramen/img/favicon-32.png"
node cdp.mjs $B/design/works/ramen/icon.html 180x180 wait=600 shot="$W/works/ramen/img/apple-touch-icon.png"
node cdp.mjs $B/design/works/ramen/og.html 1200x630 wait=1500 shot="$W/og/ramen.png"
# thumbnail: the real page's first view, gallery badge removed
node cdp.mjs $B/ramen/ 1200x900 wait=1500 "eval=document.querySelector('[data-gallery-back]')?.remove()" wait=300 webp="$W/thumbnails/ramen.webp"
ls -l "$ROOT/og/ramen.png" "$ROOT/thumbnails/ramen.webp" "$ROOT/works/ramen/img/"*.png

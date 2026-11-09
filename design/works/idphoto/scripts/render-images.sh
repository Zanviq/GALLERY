#!/bin/sh
# Render og/idphoto.png, thumbnails/idphoto.webp and the PNG favicons (dev tool, not deployed).
# Needs the local server on :8000 and a headless Chrome on CDP_PORT (default 9385).
#   sh design/works/idphoto/scripts/render-images.sh
set -e
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$(dirname "$0")"
B=http://127.0.0.1:8000
node cdp.mjs $B/design/works/idphoto/icon.html 32x32 wait=500 shot="$ROOT/works/idphoto/img/favicon-32.png"
node cdp.mjs $B/design/works/idphoto/icon.html 180x180 wait=500 shot="$ROOT/works/idphoto/img/apple-touch-icon.png"
node cdp.mjs $B/design/works/idphoto/og.html 1200x630 wait=1500 shot="$ROOT/og/idphoto.png"
# thumbnail: the real page's first view (wordmark and the 4×6 print), gallery badge removed
node cdp.mjs $B/idphoto/ 1200x900 wait=1200 "eval=document.querySelector('[data-gallery-back]')?.remove()" wait=300 webp="$ROOT/thumbnails/idphoto.webp"
ls -l "$ROOT/og/idphoto.png" "$ROOT/thumbnails/idphoto.webp" "$ROOT/works/idphoto/img/"*.png

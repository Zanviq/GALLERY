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
node cdp.mjs $B/design/works/idphoto/og.html 1200x630 wait=1200 shot="$ROOT/og/idphoto.png"
# thumbnail: the real page, customer 1 framed for the passport by keyboard (5/5), gallery badge removed
K="focus=[data-screen]"
for i in $(seq 16); do K="$K key=Shift+="; done
K="$K key=Shift+[ key=[ key=["
for i in $(seq 10); do K="$K key=Shift+ArrowDown"; done
K="$K key=ArrowDown"
for i in $(seq 6); do K="$K key=Shift+ArrowRight"; done
K="$K key=ArrowRight key=ArrowRight"
node cdp.mjs $B/idphoto/ 1200x900 wait=900 "eval=document.querySelector('[data-gallery-back]')?.remove()" $K "eval=document.activeElement.blur()" "eval=document.documentElement.style.scrollBehavior='auto'" "eval=scrollTo(0,0)" wait=600 webp="$ROOT/thumbnails/idphoto.webp"
ls -l "$ROOT/og/idphoto.png" "$ROOT/thumbnails/idphoto.webp" "$ROOT/works/idphoto/img/"*.png

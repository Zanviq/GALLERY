#!/bin/sh
# Render og/shoemaker.png, thumbnails/shoemaker.webp and the PNG favicons (dev tool, not deployed).
# Needs the local server on :8000 and a headless Chrome on CDP_PORT (default 9361).
#   sh design/works/shoemaker/scripts/render-images.sh
set -e
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd -W)"
cd "$(dirname "$0")"
B=http://127.0.0.1:8000
node cdp.mjs $B/design/works/shoemaker/icon.html 32x32 wait=600 shot="$ROOT/works/shoemaker/img/favicon-32.png"
node cdp.mjs $B/design/works/shoemaker/icon.html 180x180 wait=600 shot="$ROOT/works/shoemaker/img/apple-touch-icon.png"
node cdp.mjs $B/design/works/shoemaker/og.html 1200x630 wait=1500 shot="$ROOT/og/shoemaker.png"
# thumbnail: the real first screen, the traced foot already turned into pieces on the hide, badge removed
node cdp.mjs $B/shoemaker/ 1200x900 wait=2600 "eval=document.querySelector('[data-gallery-back]')?.remove()" click=[data-morph] wait=2200 webp="$ROOT/thumbnails/shoemaker.webp"
ls -l "$ROOT/og/shoemaker.png" "$ROOT/thumbnails/shoemaker.webp" "$ROOT/works/shoemaker/img/"*.png

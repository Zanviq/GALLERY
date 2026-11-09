#!/bin/sh
# Thumbnail, OG image and favicon PNGs for 밤차, captured from the finished page.
# Needs the local server (python tools/serve.py) and a headless Chrome on port 9347:
#   chrome --headless=new --remote-debugging-port=9347 --hide-scrollbars about:blank
# Run from the repo root: sh design/works/nighttrain/scripts/capture.sh
set -e
HERE=$(dirname "$0")
URL=http://127.0.0.1:8000/nighttrain/
NOBADGE="eval=document.querySelector('[data-gallery-back]')?.remove()"
# 1200x900 first view, webp q82
node "$HERE/cdp.mjs" "$URL" 1200x900 wait=2500 "$NOBADGE" webp=thumbnails/nighttrain.webp
# 1760x924 first view scaled to 1200x630 (same aspect; at this size the whole hero fits)
node "$HERE/cdp.mjs" "$URL" 1760x924@0.6818182 wait=2500 "$NOBADGE" shot=og/nighttrain.png
# favicons from the SVG
node "$HERE/cdp.mjs" "http://127.0.0.1:8000/nighttrain/img/favicon.svg" 32x32 wait=300 shot=works/nighttrain/img/favicon-32.png
node "$HERE/cdp.mjs" "http://127.0.0.1:8000/nighttrain/img/favicon.svg" 180x180 wait=300 shot=works/nighttrain/img/apple-touch-icon.png

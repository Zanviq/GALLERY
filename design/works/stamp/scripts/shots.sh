#!/usr/bin/env bash
# Capture round for the stamp revision (dev tool, not deployed).
#   CDP_PORT=9391 bash design/works/stamp/scripts/shots.sh <out-dir> <WxH[@dpr]> [mobile] [tag]
# Shots: cover, cover with settings open, play mid-round with a few stamps, the work log.
set -u
OUT=$1; SIZE=$2; MOB=${3:-}; TAG=${4:-$SIZE}
[ "$MOB" = "-" ] && MOB=""
HERE=$(dirname "$0")
URL=${URL:-http://127.0.0.1:8000/stamp/}
node "$HERE/cdp.mjs" "$URL" "$SIZE" $MOB \
  wait=1200 shot="$OUT/$TAG-cover.png" \
  eval="document.querySelector('.opts').open=true" wait=200 shot="$OUT/$TAG-cover-opts.png" \
  eval="document.querySelector('.opts').open=false" \
  click=#btn-start wait=500 click=#btn-skip wait=2600 \
  key=" " wait=700 key=" " wait=900 key=" " wait=500 shot="$OUT/$TAG-play.png" \
  eval="__stamp.G.elapsed=74.4" wait=3200 shot="$OUT/$TAG-log.png" \
  click=#btn-sign wait=600 shot="$OUT/$TAG-log-signed.png" \
  log="[document.documentElement.scrollWidth, innerWidth]"

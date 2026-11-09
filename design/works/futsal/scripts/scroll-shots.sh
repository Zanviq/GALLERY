#!/bin/sh
# Viewport captures down the whole page (lazy images load as they scroll in). Dev tool, not deployed.
#   sh scroll-shots.sh <W>x<H>[@dpr] <out-prefix> [mobile] [reduced]
cd "$(dirname "$0")"
SIZE=$1; OUT=$2; shift 2
H=$(echo "$SIZE" | sed 's/.*x\([0-9]*\).*/\1/')
OPS=""
i=0
while [ $i -lt ${STEPS:-14} ]; do
  OPS="$OPS eval=window.scrollTo(0,$((i * H))) wait=700 shot=${OUT}-$(printf %02d $i).png"
  i=$((i + 1))
done
node cdp.mjs "${URL:-http://127.0.0.1:8000/futsal/}" "$SIZE" "$@" wait=800 "eval=document.querySelector('[data-gallery-back]')?.remove()" log=document.documentElement.scrollHeight $OPS

#!/bin/sh
# Viewport captures of every section (dev tool). Usage: sh sections.sh <W>x<H> <prefix> [mobile]
# Writes <prefix>-<n>.png into the scratch shots folder; lazy images are switched to eager first.
cd "$(dirname "$0")"
SH="${SHOTS:-$(cygpath -m /c/Users/jaemi/AppData/Local/Temp/claude/7e6ff043f79a9415/ab92f51c-d44a-48f8-b922-d120aba180a3/scratchpad/ramen/shots)}"
SIZE=$1; P=$2; shift 2
OPS=""
i=0
for sel in '#top' '#idea' '#myeolchi' '#myeolchi>.spec' '#gochu' '#daepa' '#huchu' '#huchu>.spec' '#pack' '.packs' '#cook' '.step:nth-child(3)' '#timer' '#people' '.people__in' '#buy' '#faq' '.foot'; do
  OPS="$OPS eval=document.querySelector('$sel').scrollIntoView() wait=500 shot=$SH/$P-$i.png"
  i=$((i+1))
done
node cdp.mjs "${URL:-http://127.0.0.1:8000/ramen/}" $SIZE "$@" wait=600 "eval=document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager');document.documentElement.style.scrollBehavior='auto'" wait=1500 $OPS

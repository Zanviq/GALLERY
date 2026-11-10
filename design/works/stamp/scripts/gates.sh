#!/usr/bin/env bash
# One lean pass over the BRIEF §5 gates for works/stamp (dev tool, not deployed).
#   bash design/works/stamp/scripts/gates.sh <shot-dir>        (headless Chrome on CDP_PORT, default 9364)
# Console errors, failed requests and HTTP >= 400 are printed by cdp.mjs as [console.*] [pageerror]
# [requestfailed] [http]; anything printed besides [log] lines is a failure.
set -u
OUT=$1
HERE=$(dirname "$0")
CDP="node $HERE/cdp.mjs"
U=http://127.0.0.1:8000/stamp/
W="[innerWidth, document.documentElement.scrollWidth, document.body.scrollWidth]"
# per-frame tray movement over 60 frames: [frames, smallest step, largest step, frames standing still]
MOVE="window.__d=[];(function f(){__d.push(__stamp.G.offset);if(__d.length<61)requestAnimationFrame(f)})()"
MOVED="(()=>{const d=__d.slice(1).map((x,i)=>+(x-__d[i]).toFixed(2));return [d.length,Math.min(...d),Math.max(...d),d.filter(x=>x===0).length]})()"
for SZ in 360x740@2 390x844@2 768x1024 1024x768 1440x900 1920x1080; do
  MOB=""; case $SZ in 360*|390*) MOB=mobile;; esac
  echo "== $SZ"
  $CDP $U $SZ $MOB motion wait=900 log="$W" \
    eval="document.querySelector('.opts').open=true" wait=150 log="$W" \
    click=#btn-start wait=400 click=#btn-skip wait=1500 log="$W" \
    eval="__stamp.G.elapsed=74.6" wait=2600 log="$W" shot="$OUT/g-$SZ-log.png"
done
echo "== reduced motion: no step mode, the tray runs continuously; an old v1 step=true is ignored"
STORE_KEY=stamp.v1 $CDP $U 390x844@2 mobile reduced wait=600 store='{"step":true,"lessonDone":true}' wait=600 \
  click=#btn-start wait=3000 eval="$MOVE" wait=1500 \
  log="[__stamp.settings.step, matchMedia('(prefers-reduced-motion: reduce)').matches]" log="$MOVED" \
  key=" " wait=400 log="[document.querySelectorAll('.imp, .air-mark').length, getComputedStyle(document.querySelector('.mark, .air-mark') || document.body).animationName]"
echo "== step mode only when chosen"
$CDP $U 1440x900 motion wait=900 eval="document.querySelector('.opts').open=true" click=#opt-step \
  click=#btn-start wait=400 click=#btn-skip wait=2500 eval="$MOVE" wait=1500 \
  log="[__stamp.settings.step, JSON.parse(localStorage.getItem('stamp.v2')).step]" log="$MOVED"
echo "== ink arrives from the worker"
$CDP $U 1440x900 motion wait=900 click=#btn-start wait=400 click=#btn-skip wait=1600 \
  wait=2000 eval="__stamp.press()" wait=400 \
  log="(()=>{const c=document.querySelector('.imp');if(!c)return 'no impression';const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return [c.width,n]})()"
echo "== storage blocked"
$CDP $U 390x844@2 mobile motion nostore wait=900 click=#btn-start wait=400 click=#btn-skip wait=1500 \
  eval="__stamp.G.elapsed=74.6" wait=2600 click=#btn-sign wait=300 log="[__stamp.G.state, document.getElementById('log-off').textContent]"
echo "== /works/stamp/"
$CDP http://127.0.0.1:8000/works/stamp/ 1440x900 motion wait=1200 \
  log="[document.querySelector('.stamp img').naturalWidth, document.querySelector('.cover-stamp').naturalWidth, getComputedStyle(document.querySelector('.sheet')).backgroundImage.slice(0, 60), document.querySelector('.face').width]"
echo "== hidden tab pauses"
$CDP $U 1440x900 motion wait=900 click=#btn-start wait=400 click=#btn-skip wait=1200 \
  eval="Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))" wait=300 \
  log="[__stamp.G.state, __stamp.G.raf]"
echo "== tab order on the cover"
$CDP $U 1440x900 motion wait=900 key=Tab key=Tab key=Tab key=Tab key=Tab \
  log="[document.activeElement.id || document.activeElement.tagName, document.activeElement.textContent.trim().slice(0, 20)]" \
  key=Enter wait=200 log="document.querySelector('.opts').open"

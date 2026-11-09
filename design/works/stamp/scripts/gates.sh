#!/usr/bin/env bash
# One lean pass over the BRIEF §5 gates for works/stamp (dev tool, not deployed).
#   CDP_PORT=9391 bash design/works/stamp/scripts/gates.sh <shot-dir>
# Console errors, failed requests and HTTP >= 400 are printed by cdp.mjs as [console.*] [pageerror]
# [requestfailed] [http]; anything printed besides [log] lines is a failure.
set -u
OUT=$1
HERE=$(dirname "$0")
CDP="node $HERE/cdp.mjs"
U=http://127.0.0.1:8000/stamp/
W="[innerWidth, document.documentElement.scrollWidth, document.body.scrollWidth]"
for SZ in 360x740@2 390x844@2 768x1024 1024x768 1440x900 1920x1080; do
  MOB=""; case $SZ in 360*|390*) MOB=mobile;; esac
  echo "== $SZ"
  $CDP $U $SZ $MOB motion wait=900 log="$W" \
    eval="document.querySelector('.opts').open=true" wait=150 log="$W" \
    click=#btn-start wait=400 click=#btn-skip wait=1500 log="$W" \
    eval="__stamp.G.elapsed=74.6" wait=2600 log="$W" shot="$OUT/g-$SZ-log.png"
done
echo "== reduced motion (step mode, no flight, no knock)"
$CDP $U 390x844@2 mobile reduced wait=900 click=#btn-start wait=400 click=#btn-skip wait=2000 \
  key=" " wait=300 key=" " wait=1500 \
  log="[__stamp.settings.step, __stamp.G.pile, getComputedStyle(document.querySelector('.tray')).animationName, document.getAnimations().length]"
echo "== storage blocked"
$CDP $U 390x844@2 mobile motion nostore wait=900 click=#btn-start wait=400 click=#btn-skip wait=1500 \
  eval="__stamp.G.elapsed=74.6" wait=2600 click=#btn-sign wait=300 log="[__stamp.G.state, document.getElementById('log-off').textContent]"
echo "== /works/stamp/"
$CDP http://127.0.0.1:8000/works/stamp/ 1440x900 motion wait=1200 \
  log="[document.querySelector('.stamp img').naturalWidth, document.querySelector('.cover-stamp').naturalWidth, getComputedStyle(document.querySelector('.sheet')).backgroundImage.slice(0, 60)]"
echo "== hidden tab pauses"
$CDP $U 1440x900 motion wait=900 click=#btn-start wait=400 click=#btn-skip wait=1200 \
  eval="Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))" wait=300 \
  log="[__stamp.G.state, __stamp.G.raf]"
echo "== tab order on the cover"
$CDP $U 1440x900 motion wait=900 key=Tab key=Tab key=Tab key=Tab key=Tab \
  log="[document.activeElement.id || document.activeElement.tagName, document.activeElement.textContent.trim().slice(0, 20)]" \
  key=Enter wait=200 log="document.querySelector('.opts').open"

#!/bin/sh
# Re-captures every rendered raster the site uses (needs the dev server on :8000).
# usage: sh make_stills.sh <scratch-dir> <repo-root>
S="$1/stills"; R="$2"; mkdir -p "$S"
for sc in yuwol jocheong omi meok; do
  sh shot.sh "http://127.0.0.1:8000/perfume/?capture=bare#scent=$sc" "$S/still-$sc.png" 1600 1000 9000 &
  sh shot.sh "http://127.0.0.1:8000/perfume/?capture=bare#scent=$sc" "$S/still-$sc-tall.png" 720 1440 9000 &
  wait
  sh shot.sh "http://127.0.0.1:8000/perfume/?capture=bottle#scent=$sc" "$S/bottle-$sc.png" 900 1125 9000
done
sh shot.sh "http://127.0.0.1:8000/perfume/?capture" "$S/thumb.png" 1200 900 9000 &
sh shot.sh "http://127.0.0.1:8000/perfume/?capture=og" "$S/og.png" 1200 630 9000 &
wait
ls -la "$S"

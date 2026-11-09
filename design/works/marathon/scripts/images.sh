#!/bin/sh
# Crop and export the chosen photographs (dev tool, not deployed). Sources live in the scratchpad.
SP=/c/Users/jaemi/AppData/Local/Temp/claude/7e6ff043f79a9415/ab92f51c-d44a-48f8-b922-d120aba180a3/scratchpad
G=$SP/marathon/gen
O=works/marathon/img
T="python -I $SP/tools/img_prep.py"
$T $G/start2.jpg   $O/start    --crop 0,296,2480,1536    --widths 2000,1400,800 --q 74
$T $G/pack.jpg     $O/pack     --crop 400,360,1515,1500  --widths 1115,700 --q 78
$T $G/water2.jpg   $O/water    --crop 0,150,2528,1696    --widths 1600,800 --q 76
$T $G/medal2.jpg   $O/medal    --crop 120,300,1820,2000  --widths 1200,700 --q 78
$T $G/tshirt.jpg   $O/tshirt   --crop 58,220,1798,1960   --widths 1200,700 --q 66
$T $G/finisher.jpg $O/finisher --crop 100,260,1756,1700  --widths 1400,800 --q 78
$T $G/pacer.jpg    $O/pacer    --crop 0,330,2528,1696    --widths 1600,800 --q 76

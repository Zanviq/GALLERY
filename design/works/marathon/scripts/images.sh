#!/bin/sh
# Crop and export the chosen photographs (dev tool, not deployed). Sources live in the scratchpad.
# Since 2026-11-10 no photograph shows a person; the object shots come from people-c/gen (see IMAGES.md).
SP=/c/Users/jaemi/AppData/Local/Temp/claude/7e6ff043f79a9415/ab92f51c-d44a-48f8-b922-d120aba180a3/scratchpad
G=$SP/marathon/gen
N=$SP/people-c/gen
O=works/marathon/img
T="python -I $SP/tools/img_prep.py"
$T $N/m-start-b.jpg $O/startline --crop 0,60,2752,1436     --widths 2000,1400,800 --q 74
$T $N/m-water-b.jpg $O/cups      --crop 0,151,2528,1696    --widths 1600,800 --q 76
$T $N/m-bib-b.jpg   $O/bibs      --crop 200,260,1840,1937  --widths 1115,700 --q 78
$T $G/medal2.jpg    $O/medal     --crop 120,300,1820,2000  --widths 1200,700 --q 78
$T $G/tshirt.jpg    $O/tshirt    --crop 58,220,1798,1960   --widths 1200,700 --q 66
$T $N/m-pacer.jpg   $O/flags     --crop 0,280,2528,1647    --widths 1600,800 --q 76
$T $N/m-medals.jpg  $O/medals    --crop 0,0,2135,1856      --widths 1400,800 --q 78

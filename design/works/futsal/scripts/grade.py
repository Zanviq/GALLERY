"""Retouch one generated photo for the futsal page (dev tool, not deployed).

    python -I grade.py <src> <out.png> [--fix x0,y0,x1,y1,dx,dy ...] [--crop x0,y0,x1,y1] [--levels]

--fix clones the box from (box + dx,dy) with a feathered edge: used to paint out a stray mark
(a tiny emblem on shorts, a label on a shoe, gibberish text on a box or a sign).
--crop trims generator borders.
--levels stretches luminance between the 0.3 % and 99.7 % points (same factor on R, G, B, so the
colour does not shift) when a frame comes back a little flat.

The owner asked for bright, crisp, contemporary digital photos, so there is deliberately no
grade here: no desaturation, no shadow tint, no grain, no vignette. Export to webp is done after
this with tools/img_prep.py (crop to the layout ratio, 1600/800 or 1200/600 wide, no --grain).
"""
import argparse

import numpy as np
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('out')
ap.add_argument('--fix', action='append', default=[])
ap.add_argument('--crop')
ap.add_argument('--levels', action='store_true')
a = ap.parse_args()

im = Image.open(a.src).convert('RGB')

for f in a.fix:
    x0, y0, x1, y1, dx, dy = [int(v) for v in f.split(',')]
    patch = im.crop((x0 + dx, y0 + dy, x1 + dx, y1 + dy))
    pad = max(2, min(x1 - x0, y1 - y0) // 5)
    mask = Image.new('L', (x1 - x0, y1 - y0), 0)
    mask.paste(255, (pad, pad, x1 - x0 - pad, y1 - y0 - pad))
    mask = mask.filter(ImageFilter.GaussianBlur(pad / 1.5))
    im.paste(patch, (x0, y0), mask)

if a.crop:
    im = im.crop(tuple(int(v) for v in a.crop.split(',')))

if a.levels:
    px = np.asarray(im).astype(np.float32)
    lum = 0.2126 * px[..., 0] + 0.7152 * px[..., 1] + 0.0722 * px[..., 2]
    lo, hi = np.percentile(lum, [0.3, 99.7])
    px = np.clip((px - lo) * (255.0 / max(hi - lo, 1.0)), 0, 255)
    im = Image.fromarray((px + 0.5).astype(np.uint8))

im.save(a.out)
print(a.out, im.size)

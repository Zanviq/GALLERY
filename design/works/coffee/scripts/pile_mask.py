"""The mask that reveals a growing pile of grounds: solid in the middle, a dithered, grainy rim so the
edge of the growing heap reads as scattered grounds rather than a soft vignette (system python, -I).

    python -I pile_mask.py
"""
import math
import os
import random

from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..', 'works', 'coffee', 'img', 'pile-mask.webp'))
N = 420            # one grain per pixel, lightly softened so no square pixels show at the rim
R_IN, R_OUT = 0.58, 1.0
rnd = random.Random(20261110)
im = Image.new('L', (N, N), 0)
px = im.load()
c = (N - 1) / 2
for y in range(N):
    for x in range(N):
        # a slightly lumpy outline, so the heap is not a perfect circle
        a = math.atan2(y - c, x - c)
        lump = 1 + 0.05 * math.sin(3 * a + 0.7) + 0.035 * math.sin(7 * a + 2.1)
        d = math.hypot(x - c, y - c) / c / lump
        if d <= R_IN:
            v = 255
        elif d >= R_OUT:
            v = 0
        else:
            p = 1 - (d - R_IN) / (R_OUT - R_IN)
            v = 255 if rnd.random() < p ** 1.7 else 0
        px[x, y] = v
im = im.filter(ImageFilter.GaussianBlur(0.6)).point(lambda v: (v + 32) // 64 * 64 if v < 224 else 255)
rgba = Image.new('RGBA', im.size, (0, 0, 0, 0))
rgba.putalpha(im)
rgba.save(OUT, 'WEBP', lossless=True, quality=100, method=6)
print(OUT, os.path.getsize(OUT) // 1024, 'KB')

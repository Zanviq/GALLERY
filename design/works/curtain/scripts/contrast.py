"""Contrast of the bill's text against the velvet behind it (dev tool).

    python -I design/works/curtain/scripts/contrast.py <capture without the bill.png> <W> x0,y0,x1,y1 [...]

Takes the 95th-percentile brightest background pixel in each box (where the text sits) and reports
the contrast ratio of the text colours against it.
"""
import sys

import numpy as np
from PIL import Image

INKS = {'ink #F4F7F6': (0xF4, 0xF7, 0xF6), 'ink-2 #DCE6E2': (0xDC, 0xE6, 0xE2)}


def lum(rgb):
    c = np.asarray(rgb, dtype=np.float64) / 255
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return c @ np.array([0.2126, 0.7152, 0.0722])


im = np.asarray(Image.open(sys.argv[1]).convert('RGB'))
scale = im.shape[1] / float(sys.argv[2])
for box in sys.argv[3:]:
    x0, y0, x1, y1 = [round(int(v) * scale) for v in box.split(',')]
    px = im[y0:y1, x0:x1].reshape(-1, 3)
    L = lum(px)
    bg = float(np.percentile(L, 95))
    out = ', '.join(f'{k} {(lum(v) + 0.05) / (bg + 0.05):.1f}:1' for k, v in INKS.items())
    print(f'{box}: background p95 luminance {bg:.3f} -> {out}')

"""Worst-case contrast of hero text against the live liquid behind it.

    python -I hero_contrast.py <shot-without-text.png> <rects.json> <dpr>

rects.json: [{"name", "x", "y", "w", "h", "color": "rgb(a, b, c)"}] in CSS px (from the page).
For every box it takes the 95th-percentile background luminance (the brightest realistic patch
behind the glyphs) and reports the WCAG ratio against the text colour.
"""
import json
import re
import sys

from PIL import Image

img = Image.open(sys.argv[1]).convert('RGB')
rects = json.load(open(sys.argv[2], encoding='utf-8'))
dpr = float(sys.argv[3])


def lum(c):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])


worst = 99
for r in rects:
    x0, y0 = int(r['x'] * dpr), int(r['y'] * dpr)
    x1, y1 = int((r['x'] + r['w']) * dpr), int((r['y'] + r['h']) * dpr)
    crop = img.crop((max(0, x0), max(0, y0), min(img.width, x1), min(img.height, y1)))
    px = list(crop.getdata())
    if not px:
        continue
    ls = sorted(lum(p) for p in px)
    bg = ls[int(len(ls) * 0.95) - 1]
    fg = lum([int(v) for v in re.findall(r'[\d.]+', r['color'])[:3]])
    ratio = (max(fg, bg) + 0.05) / (min(fg, bg) + 0.05)
    worst = min(worst, ratio)
    print(f"{r['name']:<14} bg95 L={bg:.3f}  ratio {ratio:5.2f}  {'ok' if ratio >= (3 if r.get('large') else 4.5) else 'LOW'}")
print('worst', round(worst, 2))

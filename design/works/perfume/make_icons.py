"""Brand mark paths + favicons for 담금.

    python -I make_icons.py <repo-root>

The mark is the bottle's cross-section: a superellipse vessel with a liquid line a little under
half way. Prints the SVG path data (pasted into index.html) and writes
works/perfume/img/favicon.svg, apple-touch-icon.png (180), favicon-32.png.
"""
import math
import os
import sys

from PIL import Image, ImageDraw

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, 'works', 'perfume', 'img')


def squircle(cx, cy, w, h, n=4.0, steps=72):
    pts = []
    for i in range(steps):
        th = 2 * math.pi * i / steps
        c, s = math.cos(th), math.sin(th)
        pts.append((cx + math.copysign(abs(c) ** (2 / n), c) * w / 2,
                    cy + math.copysign(abs(s) ** (2 / n), s) * h / 2))
    return pts


def clip_below(pts, level):
    out = []
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        ina, inb = a[1] >= level, b[1] >= level
        if ina:
            out.append(a)
        if ina != inb:
            t = (level - a[1]) / (b[1] - a[1])
            out.append((a[0] + (b[0] - a[0]) * t, level))
    return out


def path(pts):
    return 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in pts) + 'Z'


# mark in a 24-unit box: vessel 16 x 22, liquid line at 56% height
outer = squircle(12, 12, 16, 22)
inner = squircle(12, 12, 12.4, 18.4)
liquid = clip_below(inner, 12 + 22 * 0.06)
print('OUTER', path(outer))
print('LIQUID', path(liquid))

NIGHT = (35, 18, 6)
GLOW = (240, 184, 94)
PAPER = (246, 234, 216)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<path d="{path(squircle(16, 16, 31, 31, n=4.6))}" fill="#231206"/>
<path d="{path([(x + 4, y + 4) for x, y in outer])}" fill="none" stroke="#f6ead8" stroke-width="1.6"/>
<path d="{path([(x + 4, y + 4) for x, y in liquid])}" fill="#f0b85e"/>
</svg>
'''
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'favicon.svg'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(svg)


def raster(size, name, pad_bg=True):
    S = 8
    W = size * S
    img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    k = W / 32
    bg = squircle(16 * k, 16 * k, 31 * k, 31 * k, n=4.6, steps=200) if pad_bg else None
    if pad_bg:
        d.polygon(bg, fill=NIGHT + (255,))
    o = [(x * k + 4 * k, y * k + 4 * k) for x, y in squircle(12, 12, 16, 22, steps=200)]
    li = [(x * k + 4 * k, y * k + 4 * k) for x, y in clip_below(squircle(12, 12, 12.4, 18.4, steps=200), 12 + 22 * 0.06)]
    d.line(o + [o[0]], fill=PAPER + (255,), width=int(1.6 * k), joint='curve')
    d.polygon(li, fill=GLOW + (255,))
    img = img.resize((size, size), Image.LANCZOS)
    img.save(os.path.join(OUT, name), optimize=True)


raster(180, 'apple-touch-icon.png')
raster(32, 'favicon-32.png')
print(sorted(os.listdir(OUT)))

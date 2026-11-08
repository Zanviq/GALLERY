"""Raster fallbacks of the swell mark: favicon-32.png and apple-touch-icon.png (180)."""
import os, sys
from PIL import Image, ImageDraw
OUT = sys.argv[1]

def bez(p0, p1, p2, p3, n=40):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1-t)**3*p0[0] + 3*(1-t)**2*t*p1[0] + 3*(1-t)*t**2*p2[0] + t**3*p3[0]
        y = (1-t)**3*p0[1] + 3*(1-t)**2*t*p1[1] + 3*(1-t)*t**2*p2[1] + t**3*p3[1]
        pts.append((x, y))
    return pts

def mark(size, pad=0):
    S = 8
    W = size * S
    im = Image.new('RGB', (W, W), '#EE4A26')
    d = ImageDraw.Draw(im)
    u = (W - 2 * pad * S) / 32
    o = pad * S
    P = lambda x, y: (o + x * u, o + y * u)
    d.rectangle([P(6, 8.5 - 1.25), P(26, 8.5 + 1.25)], fill='#121413')
    d.rectangle([P(6, 23.5 - 1.25), P(26, 23.5 + 1.25)], fill='#121413')
    top = bez(P(5, 16), P(10.5, 10.6), P(21.5, 10.6), P(27, 16))
    bot = bez(P(27, 16), P(21.5, 21.4), P(10.5, 21.4), P(5, 16))
    d.polygon(top + bot, fill='#121413')
    return im.resize((size, size), Image.LANCZOS)

mark(32).save(os.path.join(OUT, 'favicon-32.png'))
mark(180, pad=10).save(os.path.join(OUT, 'apple-touch-icon.png'))
print('icons ok')

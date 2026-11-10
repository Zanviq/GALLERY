"""Crop, level and export the generated photographs for works/coffee/img/ (dev tool, not deployed).

    python -I design/works/coffee/scripts/prep_images.py <dir with the generated .jpg files>

- Photos that sit straight on the white page (grind piles, bean heaps, cascara) get their paper
  levelled to pure #FFFFFF so they have no visible edge.
- The five grind piles are re-centred on the pile and cropped at one common size, so the pile stays
  in place when the page cross-fades between grind sizes.
- The four bean heaps are cut from one photograph, one square per heap.
- The shopfront is cropped to the facade (the generated street had road markings), and the labels
  on the shelf behind the glass are softened so nothing reads as fake lettering.
"""
import os
import sys

from PIL import Image, ImageFilter, ImageOps

SRC = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..', 'works', 'coffee', 'img'))
os.makedirs(OUT, exist_ok=True)


def load(name):
    return Image.open(os.path.join(SRC, name)).convert('RGB')


def level_white(im, lo=None, knee=18):
    """Map the paper tone to 255. lo = paper luminance (median of the corners if not given)."""
    if lo is None:
        g = ImageOps.grayscale(im)
        w, h = g.size
        s = 40
        samples = []
        for (x, y) in ((0, 0), (w - s, 0), (0, h - s), (w - s, h - s)):
            samples += list(g.crop((x, y, x + s, y + s)).getdata())
        samples.sort()
        lo = samples[len(samples) // 4]
    lo = max(lo - 6, 120)
    scale = 255.0 / lo
    # straight gain up to the paper tone, so the paper and the faint shadow edge both reach 255
    lut = [min(255, int(round(v * scale))) for v in range(256)]
    return im.point(lut * 3)


def save(im, base, widths, q=80):
    out = []
    for w in widths:
        w2 = min(w, im.width)
        h2 = round(im.height * w2 / im.width)
        p = os.path.join(OUT, f'{base}-{w2}.webp')
        im.resize((w2, h2), Image.LANCZOS).save(p, 'WEBP', quality=q, method=6)
        out.append((os.path.basename(p), w2, h2, os.path.getsize(p) // 1024))
    print(base, out)


def dark_bbox(im, thr=170):
    g = ImageOps.grayscale(im).point(lambda v: 255 if v < thr else 0)
    return g.getbbox()


def centroid(im, thr=170):
    g = ImageOps.grayscale(im).resize((im.width // 8, im.height // 8))
    px = g.load()
    sx = sy = n = 0
    for y in range(g.height):
        for x in range(g.width):
            if px[x, y] < thr:
                sx += x; sy += y; n += 1
    return (sx / n * 8, sy / n * 8)


# 1. grind piles: one common crop size, centred on each pile
GRINDS = ['espresso', 'moka', 'drip', 'press', 'cold']
side = 1500
for g in GRINDS:
    im = load(f'grind-{g}.jpg')
    cx, cy = centroid(im)
    x0 = int(min(max(cx - side / 2, 0), im.width - side))
    y0 = int(min(max(cy - side / 2 - 30, 0), im.height - side))
    im = level_white(im.crop((x0, y0, x0 + side, y0 + side)))
    save(im, f'grind-{g}', [900, 560], q=78)

# 2. bean heaps: four squares from one photograph
im = load('heaps.jpg')
im = level_white(im)
w, h = im.size
# find heap columns: dark pixels per column band
g = ImageOps.grayscale(im).resize((w // 4, 1), Image.BOX)
cols = [x * 4 for x, v in enumerate(g.getdata()) if v < 225]
runs, start, prev = [], cols[0], cols[0]
for x in cols[1:]:
    if x - prev > 40:
        runs.append((start, prev)); start = x
    prev = x
runs.append((start, prev))
runs = [r for r in runs if r[1] - r[0] > 200][:4]
print('heap runs', runs)
sq = 760
for i, (a, b) in enumerate(runs, 1):
    cx = (a + b) / 2
    bb = dark_bbox(im.crop((a, 0, b, h)))
    cy = (bb[1] + bb[3]) / 2
    x0 = int(min(max(cx - sq / 2, 0), w - sq))
    y0 = int(min(max(cy - sq / 2, 0), h - sq))
    save(im.crop((x0, y0, x0 + sq, y0 + sq)), f'heap-{i}', [640, 400], q=80)

# 3. cascara on white
im = level_white(load('cascara.jpg'))
save(im.crop((300, 120, 2300, 1560)), 'cascara', [1400, 800])

# 4. framed photographs
im = load('hero.jpg')
save(im, 'hero', [1200, 720], q=78)
save(im.crop((0, 700, 1856, 2304)), 'hero-m', [900, 560], q=78)   # phones: the tray only
save(load('roaster.jpg'), 'roaster', [1600, 800])
save(load('counter.jpg'), 'counter', [1600, 800])
save(load('drinks.jpg'), 'drinks', [1600, 800])
save(load('bags.jpg'), 'bags', [1100, 640])
im = load('shopfront.jpg')
region = (960, 930, 1390, 1110)
im.paste(im.crop(region).filter(ImageFilter.GaussianBlur(4)), region[:2])
save(im.crop((205, 130, 1700, 1600)), 'shopfront', [1100, 640])

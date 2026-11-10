"""Cut the photographed keycaps out of their grey backdrop to alpha webp (dev tool, not deployed).

    python -I caps_cut.py <caps-a.jpg> <hero-2400.webp> <out-dir> [--preview preview.png]

The source photo (IMAGES.md, caps-a) has nine 1u keycaps in a row and a spacebar below, on plain
neutral grey paper. The caps are pink and the paper is grey, so chroma (R minus the mean of G and B)
separates them: paper ~2, caps 29-65. The paper's shadows are tinted pink by bounce light (chroma
11-26) but are dark and only weakly saturated, so a strict mask (chroma > 28 and either bright or
saturated) finds each cap without its shadow; its convex hull, drawn antialiased, is intersected with
a soft chroma alpha (which keeps the scooped top edge from filling with grey). Grey is un-mixed from
edge pixels.

Colour: the caps were lit under neutral grey, so their sides came out brownish. Each pixel's
luminance is scaled so the cap tops match the keycap tops in the hero photo, then recoloured with a
luminance -> RGB table built from the hero photo's keycap area. The result has the hero's light-pink
tops and magenta sides. The page draws its own contact shadow so it can change on a key press.

The photo's homing bars sit on caps 4 and 6 (counting from 1); the page wants them on F and J, so the
caps are written in key order A S D F G H J K L from source caps 0 1 2 3 4 6 5 7 8.
"""
import argparse
import os

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.spatial import ConvexHull

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('hero')
ap.add_argument('out')
ap.add_argument('--preview')
a = ap.parse_args()

im = np.asarray(Image.open(a.src).convert('RGB')).astype(np.float64)
H, W = im.shape[:2]
R, G, B = im[..., 0], im[..., 1], im[..., 2]
lum = 0.3 * R + 0.59 * G + 0.11 * B
chroma = R - (G + B) / 2
bg = im[40:380, 80:W - 80].reshape(-1, 3).mean(0)
c = chroma - np.median(chroma[40:380, 80:W - 80])
sat = c / np.maximum(lum, 1)

soft = np.clip((c - 6.0) / 16.0, 0, 1)
strict = (c > 31) | ((lum > 165) & (c > 20))
strict = ndimage.binary_opening(strict, iterations=2)
strict = ndimage.binary_fill_holes(strict)
lab, n = ndimage.label(strict)
sizes = ndimage.sum(strict, lab, range(1, n + 1))
keep = (np.argsort(sizes)[::-1][:10] + 1).tolist()
print('objects', n, 'kept', sorted((int(sizes[k - 1]) for k in keep), reverse=True))

objs = []
for k in keep:
    ys, xs = np.nonzero(lab == k)
    objs.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, k))
space = max(objs, key=lambda o: o[2] - o[0])
caps = sorted([o for o in objs if o is not space], key=lambda o: o[0])
assert len(caps) == 9

# luminance -> colour table from the hero's keycap area
hero = np.asarray(Image.open(a.hero).convert('RGB')).astype(np.float64)[650:975, 0:1300].reshape(-1, 3)
hl = 0.3 * hero[:, 0] + 0.59 * hero[:, 1] + 0.11 * hero[:, 2]
bins = np.arange(0, 257, 4)
lut = np.zeros((len(bins) - 1, 3))
have = np.zeros(len(bins) - 1, bool)
for i in range(len(bins) - 1):
    m = (hl >= bins[i]) & (hl < bins[i + 1])
    if m.sum() > 40:
        lut[i] = hero[m].mean(0)
        have[i] = True
centers = (bins[:-1] + bins[1:]) / 2
lo, hi = np.nonzero(have)[0][[0, -1]]
for ch in range(3):
    lut[:, ch] = np.interp(centers, centers[have], lut[have, ch])
# beyond the measured range, scale the end colours with luminance
for i in range(len(centers)):
    if i < lo:
        lut[i] = lut[lo] * centers[i] / centers[lo]
    elif i > hi:
        lut[i] = np.clip(lut[hi] + (255 - lut[hi]) * (centers[i] - centers[hi]) / (255 - centers[hi]), 0, 255)
print('lut range', centers[lo], centers[hi], 'top', lut[int(190 / 4)].round())

tops = []
for x0, y0, x1, y1, _ in caps:
    cy, cx = int(y0 + (y1 - y0) * 0.22), (x0 + x1) // 2
    tops.append(lum[cy - 10:cy + 10, cx - 30:cx + 30].mean())
hero_top = 192.0  # hero cap tops measure about #EEA6C6 (luminance ~192)
scale = hero_top / np.mean(tops)
print('cap top luminance', round(float(np.mean(tops)), 1), 'scale', round(float(scale), 3))

ORDER = {'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4, 'h': 6, 'j': 5, 'k': 7, 'l': 8}
PAD = 4
SS = 4
os.makedirs(a.out, exist_ok=True)
meta = {}


def cut(obj, name):
    x0, y0, x1, y1, k = obj
    x0, y0, x1, y1 = max(0, x0 - PAD), max(0, y0 - PAD), min(W, x1 + PAD), min(H, y1 + PAD)
    mask = lab[y0:y1, x0:x1] == k
    ys, xs = np.nonzero(mask)
    pts = np.column_stack([xs, ys]).astype(np.float64)
    hull = pts[ConvexHull(pts).vertices]
    h, w = mask.shape
    canvas = Image.new('L', (w * SS, h * SS), 0)
    ImageDraw.Draw(canvas).polygon([(float(x * SS + SS / 2), float(y * SS + SS / 2)) for x, y in hull], fill=255)
    hull_a = np.asarray(canvas.resize((w, h), Image.BOX)).astype(np.float64) / 255
    hull_a = ndimage.grey_erosion(hull_a, size=(2, 2))  # pull the edge in a pixel, off the shadow
    al = np.minimum(hull_a, np.maximum(soft[y0:y1, x0:x1], ndimage.binary_erosion(mask, iterations=2)))
    rgb = im[y0:y1, x0:x1].copy()
    a3 = al[..., None]
    un = (rgb - (1 - a3) * bg) / np.where(a3 > 0.05, a3, 1)
    rgb = np.clip(np.where(a3 > 0.05, un, rgb), 0, 255)
    l2 = np.clip((0.3 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2]) * scale, 0, 255)
    idx = np.clip(l2 / 4 - 0.5, 0, len(centers) - 1)
    i0 = np.floor(idx).astype(int)
    i1 = np.minimum(i0 + 1, len(centers) - 1)
    f = (idx - i0)[..., None]
    col = lut[i0] * (1 - f) + lut[i1] * f
    # keep a little of the photo's own colour variation (film grain lives in all three channels)
    grain = rgb * scale - l2[..., None]
    col = np.clip(col + grain * 0.35, 0, 255)
    out = np.dstack([col, al * 255]).round().astype(np.uint8)
    img = Image.fromarray(out)
    if name != 'space':
        # every 1u cap goes on the same canvas, centred and standing on the bottom edge, so the page
        # can scale all nine by one number
        cw, ch = CAP_CANVAS
        board = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        board.alpha_composite(img, ((cw - img.size[0]) // 2, ch - img.size[1]))
        img = board
        # top face = the bright part; report it as fractions for the legend position
        arr = np.asarray(img).astype(np.float64)
        lum2 = 0.3 * arr[..., 0] + 0.59 * arr[..., 1] + 0.11 * arr[..., 2]
        ys, xs = np.nonzero((lum2 > 185) & (arr[..., 3] > 250))
        print('  top face x %.2f-%.2f y %.2f-%.2f' % (xs.min() / cw, xs.max() / cw, ys.min() / ch, ys.max() / ch))
    path = os.path.join(a.out, f'cap-{name}.webp')
    img.save(path, 'WEBP', quality=86, alpha_quality=92, method=6)
    meta[name] = img.size
    print(name, img.size, os.path.getsize(path), 'bytes')
    return img


def size_of(obj):
    x0, y0, x1, y1, _ = obj
    return min(W, x1 + PAD) - max(0, x0 - PAD), min(H, y1 + PAD) - max(0, y0 - PAD)


CAP_CANVAS = (max(size_of(o)[0] for o in caps) + 4, max(size_of(o)[1] for o in caps) + 2)
print('cap canvas', CAP_CANVAS)


tiles = [cut(caps[i], nm) for nm, i in ORDER.items()]
tiles.append(cut(space, 'space'))

if a.preview:
    th = max(t.size[1] for t in tiles[:9])
    pw = sum(t.size[0] for t in tiles[:9]) + 40 * 10
    pv = Image.new('RGBA', (pw, th * 2 + 120), (246, 163, 194, 255))
    x = 40
    for t in tiles[:9]:
        pv.alpha_composite(t, (x, 40))
        x += t.size[0] + 40
    pv.alpha_composite(tiles[9], (40, th + 80))
    side = Image.new('RGBA', (pw // 2, th * 2 + 120), (209, 47, 107, 255))
    side.alpha_composite(tiles[3], (40, 40))
    side.alpha_composite(tiles[4], (80 + tiles[3].size[0], 40))
    pv.alpha_composite(side, (tiles[9].size[0] + 80, 0))
    pv.convert('RGB').save(a.preview)

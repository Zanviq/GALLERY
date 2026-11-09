"""Cut the generated photographs into the layers the page stacks around the sand.

    python -I build_images.py <gen dir> <geo.json> <works/sand/img>

Inputs in <gen dir> (see design/works/sand/IMAGES.md for the prompts):
  bottle-b.jpg        the empty bottle on black          -> bottle-back.webp (under the sand)
  bottle-b-black.jpg  the same bottle filled with black sand: only its glass shows over the sand
                                                          -> bottle-front.webp (over the sand)
  bottle-b-cork.jpg   the same bottle with a cork         -> cork.webp (cut out)
  jar-a.jpg           a jar of white sand                 -> jar-1..5.webp (recoloured to the five sands)

Every layer is "glass on black" turned into white light with alpha = its brightness, so it sits on
black exactly as photographed and adds its light over the sand (or over the windowsill photo) with
plain alpha blending. Everything outside the bottle (the strip lights) is cut away.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image

GEN = pathlib.Path(sys.argv[1])
geo = json.load(open(sys.argv[2]))
OUT = pathlib.Path(sys.argv[3])
OUT.mkdir(parents=True, exist_ok=True)

X0, Y0, CW, CH = geo['crop']
X0, Y0, CW, CH = int(X0), int(Y0), int(CW), int(CH)
CELL = CW / geo['W']
SCALE = 2 / CELL                     # export at 2 px per grid cell
OW, OH = round(CW * SCALE), round(CH * SCALE)


def load(name):
    return np.asarray(Image.open(GEN / name).convert('RGB')).astype(np.float32) / 255


def crop(a):
    """The grid box, padded with black above the photo."""
    H, W, _ = a.shape
    out = np.zeros((CH, CW, 3), np.float32)
    ys, ye = max(0, Y0), min(H, Y0 + CH)
    out[ys - Y0:ye - Y0, :, :] = a[ys:ye, X0:X0 + CW, :]
    return out


def silhouette(a, pad=10):
    """Mask of the bottle: per row, between the outermost bright pixels near the axis."""
    L = a.mean(axis=2)
    m = np.zeros(L.shape, bool)
    cx = CW // 2
    for y in range(L.shape[0]):
        row = L[y, cx - 580:cx + 580]
        idx = np.where(row > 0.15)[0]
        if len(idx):
            m[y, max(0, cx - 580 + idx[0] - pad):cx - 580 + idx[-1] + pad + 1] = True
    return m


def light_layer(a, mask, floor=0.0):
    """Glass on black -> white-ish light with alpha = brightness (straight alpha)."""
    L = a.max(axis=2)
    alpha = np.clip((L - floor) / (1 - floor), 0, 1) * mask
    rgb = np.where(L[..., None] > 1e-3, a / np.maximum(L[..., None], 1e-3), 1.0)
    rgba = np.concatenate([rgb, alpha[..., None]], axis=2)
    return rgba


def save(rgba, name, size, q=82):
    im = Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')
    im = im.resize(size, Image.LANCZOS)
    im.save(OUT / name, 'WEBP', quality=q, method=6, alpha_quality=90)
    print(name, im.size, (OUT / name).stat().st_size // 1024, 'KB')


def interior_mask(dilate_cells=1.5):
    m = np.zeros((CH, CW), bool)
    xs = np.arange(CW)
    for gy, hw in enumerate(geo['hw']):
        if hw <= 0:
            continue
        y0, y1 = int(gy * CELL), int((gy + 1) * CELL)
        m[y0:y1] = np.abs((xs + 0.5) / CELL - geo['cx']) < hw + dilate_cells
    return m


empty = crop(load('bottle-b.jpg'))
black = crop(load('bottle-b-black.jpg'))
corked = crop(load('bottle-b-cork.jpg'))
sil = silhouette(empty)

# back: the whole empty bottle
save(light_layer(empty, sil, floor=0.02), 'bottle-back.webp', (OW, OH))

# front: the glass of the black-filled bottle, over the interior only. The black sand's own glitter
# (single bright grains) is opened away: only light that runs along a line at least 9 px long,
# up and down or across, survives, which keeps the reflections and drops the specks.


def open_line(a, n, axis):
    pad = [(0, 0)] * a.ndim
    pad[axis] = (n, n)
    p = np.pad(a, pad, mode='edge')
    sl = lambda k: tuple(slice(k, k + a.shape[axis]) if d == axis else slice(None) for d in range(a.ndim))
    ero = np.minimum.reduce([p[sl(n + k)] for k in range(-(n // 2), n // 2 + 1)])
    p2 = np.pad(ero, pad, mode='edge')
    return np.maximum.reduce([p2[sl(n + k)] for k in range(-(n // 2), n // 2 + 1)])


clean = np.maximum(open_line(black, 9, 0), open_line(black, 9, 1))
inner = interior_mask()
save(light_layer(clean, inner, floor=0.16), 'bottle-front.webp', (OW, OH))

# cork: brown, inside the lip/neck box; per row the span between the outermost cork pixels
r, g, b = corked[..., 0], corked[..., 1], corked[..., 2]
brown = (r - b > 0.09) & (r > 0.22) & (r >= g)
box = np.zeros_like(brown)
by0, by1 = int(0 - Y0), int(560 - Y0)
box[by0:by1, CW // 2 - 220:CW // 2 + 220] = True
brown &= box
rows = np.where(brown.sum(axis=1) > 12)[0]
cy0, cy1 = rows.min(), rows.max() + 1
cork_mask = np.zeros_like(brown)
spans = []
for y in range(cy0, cy1):
    xs = np.where(brown[y])[0]
    if len(xs) > 12:
        spans.append((y, np.percentile(xs, 1), np.percentile(xs, 99)))
ys = np.array([s[0] for s in spans])
ls = np.array([s[1] for s in spans])
rs = np.array([s[2] for s in spans])
for y in range(cy0, cy1):
    j = np.argmin(np.abs(ys - y))
    lo, hi = max(0, j - 4), j + 5
    l, rr = np.median(ls[lo:hi]), np.median(rs[lo:hi])
    cork_mask[y, int(l):int(rr) + 1] = True
# soften the edge by one photo pixel
cm = cork_mask.astype(np.float32)
soft = (cm + np.roll(cm, 1, 1) + np.roll(cm, -1, 1) + np.roll(cm, 1, 0) + np.roll(cm, -1, 0)) / 5
cxs = np.where(cork_mask.any(axis=0))[0]
cx0, cx1 = cxs.min(), cxs.max() + 1
rgba = np.concatenate([corked, soft[..., None]], axis=2)[cy0:cy1, cx0:cx1]
csz = (round((cx1 - cx0) * SCALE), round((cy1 - cy0) * SCALE))
save(rgba, 'cork.webp', csz, q=86)
cork_box = [round(cx0 / CELL, 2), round(cy0 / CELL, 2), round((cx1 - cx0) / CELL, 2), round((cy1 - cy0) / CELL, 2)]
print('cork box (cells)', cork_box)

# jars: white sand recoloured to the five sands; glass becomes light-with-alpha
jar = np.asarray(Image.open(GEN / 'jar-a.jpg').convert('RGB')).astype(np.float32) / 255
JL = jar.mean(axis=2)
Jmax = jar.max(axis=2)
Jsat = Jmax - jar.min(axis=2)
H, W = JL.shape
# the sand: bright, almost colourless, and dense (thin glass highlights are bright too, but sparse)
yy, xx = np.mgrid[0:H, 0:W]
raw = ((JL > 0.24) & (Jsat < 0.12) & (yy > 0.25 * H) & (yy < 0.93 * H) & (xx > 0.2 * W) & (xx < 0.8 * W))


def box(a, r):
    c = np.pad(a.astype(np.float32), r + 1).cumsum(0).cumsum(1)
    n = 2 * r + 1
    return (c[n:, n:] - c[:-n, n:] - c[n:, :-n] + c[:-n, :-n])[:a.shape[0], :a.shape[1]] / (n * n)


from scipy import ndimage  # noqa: E402  (slow to import, only needed here)

sand = box(raw, 12) > 0.6
lab, nlab = ndimage.label(sand)
sizes = ndimage.sum(sand, lab, range(1, nlab + 1))
sand = ndimage.binary_fill_holes(lab == (1 + int(np.argmax(sizes))))
sand = box(sand, 3) > 0.5
ref = np.median(JL[sand])
SANDS = {1: (0xE4, 0x00, 0x7F), 2: (0xFF, 0xE4, 0x19), 3: (0x1F, 0x4F, 0xE0), 4: (0x6C, 0xCB, 0x2A), 5: (0xF2, 0xF4, 0xF5)}
spec = np.clip((JL - 0.93) / 0.07, 0, 1)[..., None]           # keep the brightest glints white
shade = np.clip(JL / ref, 0, 1.25)[..., None]
glass_alpha = np.clip((Jmax - 0.03) / 0.97, 0, 1)
glass_rgb = np.where(Jmax[..., None] > 1e-3, jar / np.maximum(Jmax[..., None], 1e-3), 1.0)
# crop to the jar with a margin
cols = np.where((glass_alpha > 0.2).sum(axis=0) > 20)[0]
rws = np.where((glass_alpha > 0.2).sum(axis=1) > 20)[0]
jx0, jx1 = max(0, cols.min() - 16), min(W, cols.max() + 17)
jy0, jy1 = max(0, rws.min() - 16), min(H, rws.max() + 17)
for n, rgb in SANDS.items():
    c = np.array(rgb, np.float32) / 255
    tint = c * shade ** 0.9
    if n == 5:
        tint = jar
    tint = tint * (1 - spec) + jar * spec
    out_rgb = np.where(sand[..., None], tint, glass_rgb)
    out_a = np.where(sand, 1.0, glass_alpha)
    rgba = np.concatenate([out_rgb, out_a[..., None]], axis=2)[jy0:jy1, jx0:jx1]
    w = 240
    save(rgba, f'jar-{n}.webp', (w, round(w * (jy1 - jy0) / (jx1 - jx0))), q=84)
# where the rim's right corner is (fraction of the jar image), for the pour pivot
rim_rows = np.where((glass_alpha[jy0:jy1, jx0:jx1] > 0.35).sum(axis=1) > 10)[0]
print('jar crop', jx0, jy0, jx1, jy1, 'top row', rim_rows.min() / (jy1 - jy0))

meta = {'cork': cork_box}
(OUT.parent / 'js').mkdir(exist_ok=True)
print('meta', json.dumps(meta))

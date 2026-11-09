"""Turn the windowsill photograph (a bottle of colour-key magenta sand) into the finish scene.

    python -I build_scene.py <sill.jpg> <works/sand/img> <works/sand/js/scene.js>

Writes
  sill.webp        the photo, 1080 wide, with the magenta taken out of the glass around the sand
  sill-sand.webp   over the sand's bounding box: RGB = how much light falls on the sand there
                   (grey 128 = average), A = where the sand is (soft edge)
  sill-glint.webp  over the same box: the reflections on the glass in front of the sand (white + alpha)
  scene.json       the box, the sand's left/right edge per row, and the anchors the page uses to map
                   the visitor's grid onto this bottle
The page multiplies the visitor's own grains by the light map, so the sun, the shade under the
shoulder and the glass reflections of the real photograph fall on their layers.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image

SRC, OUT, META = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
OW = 1080

im = Image.open(SRC).convert('RGB')
OH = round(im.height * OW / im.width)
im = im.resize((OW, OH), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255
R, G, B = a[..., 0], a[..., 1], a[..., 2]
V = a.max(axis=2)
mag = ((R + B) / 2 - G) / np.maximum(V, 1e-3)            # 0 for greys and the blue sky, ~0.5 for the sand


def box(x, r):
    c = np.pad(x.astype(np.float32), r + 1).cumsum(0).cumsum(1)
    n = 2 * r + 1
    return (c[n:, n:] - c[:-n, n:] - c[n:, :-n] + c[:-n, :-n])[:x.shape[0], :x.shape[1]] / (n * n)


soft = np.clip((mag - 0.10) / 0.16, 0, 1)
core = box(soft > 0.5, 6) > 0.6                          # the body of sand, without stray tinted pixels
ys, xs = np.where(core)
# keep the biggest blob's rows: the sand is one row-convex body around the bottle axis
x_mid = int(np.median(xs))
rows = {}
for y in range(OH):
    on = np.where(core[y])[0]
    if len(on) < 6:
        continue
    near = on[np.abs(on - x_mid) < OW * 0.25]
    if len(near) < 6:
        continue
    rows[y] = (int(near.min()), int(near.max()))
ylist = sorted(rows)
# drop isolated rows (reflections in the base below the sand)
top, bot = ylist[0], ylist[-1]
run = [ylist[0]]
best = []
for y in ylist[1:]:
    if y - run[-1] <= 2:
        run.append(y)
    else:
        if len(run) > len(best):
            best = run
        run = [y]
if len(run) > len(best):
    best = run
top, bot = best[0], best[-1]
alpha = np.zeros((OH, OW), np.float32)
for y in range(top, bot + 1):
    l, r = rows.get(y, rows[min(rows, key=lambda k: abs(k - y))])
    alpha[y, l:r + 1] = 1
# soft edge: the original tint at the boundary
edge = (box(alpha > 0.5, 2) > 0) & (box(alpha > 0.5, 2) < 1)
alpha = np.where(edge, np.maximum(alpha * 0.5, soft) * (box(alpha, 1) > 0), alpha)

bx0 = int(min(rows[y][0] for y in range(top, bot + 1) if y in rows)) - 4
bx1 = int(max(rows[y][1] for y in range(top, bot + 1) if y in rows)) + 5
by0, by1 = top - 4, bot + 5

# light on the sand: brightness of the magenta relative to its median, smoothed a little;
# reflections (bright and colourless inside the sand) go to the glint layer instead
inside = alpha > 0.5
spec = inside & (mag < 0.14) & (V > np.median(V[inside]) * 1.08)
Vs = np.where(spec, np.nan, V)
med = np.nanmedian(Vs[inside])
fillv = np.where(np.isnan(Vs), med, Vs)
w = (~np.isnan(Vs)).astype(np.float32)
lm = box(fillv * w, 3) / np.maximum(box(w, 3), 1e-3)
light = np.where(spec, lm, V) / med
light = 0.6 * light + 0.4 * (box(light * inside, 2) / np.maximum(box(inside.astype(np.float32), 2), 1e-3))
glint = np.clip((V - lm) / np.maximum(1 - lm, 1e-3), 0, 1) * spec
glint = np.maximum(glint, np.clip((V - 0.92) / 0.08, 0, 1) * inside * (mag < 0.2))

# the scene: take the magenta cast out of everything near the bottle (fringes, the glass base)
grey = (0.3 * R + 0.59 * G + 0.11 * B)[..., None].repeat(3, axis=2)
near = np.zeros((OH, OW), bool)
near[by0 - 40:by1 + 160, bx0 - 40:bx1 + 40] = True
tint = np.clip((mag - 0.04) / 0.12, 0, 1)[..., None] * near[..., None]
scene = a * (1 - tint) + grey * tint
Image.fromarray((np.clip(scene, 0, 1) * 255 + 0.5).astype(np.uint8)).save(OUT / 'sill.webp', 'WEBP', quality=82, method=6)

sl = slice(by0, by1), slice(bx0, bx1)
lg = np.clip(light[sl] / 2, 0, 1)
sand_rgba = np.stack([lg, lg, lg, alpha[sl]], axis=2)
Image.fromarray((sand_rgba * 255 + 0.5).astype(np.uint8)).save(OUT / 'sill-sand.webp', 'WEBP', quality=90, method=6, alpha_quality=95)
gl = np.stack([np.ones_like(lg), np.ones_like(lg), np.ones_like(lg), glint[sl]], axis=2)
Image.fromarray((gl * 255 + 0.5).astype(np.uint8)).save(OUT / 'sill-glint.webp', 'WEBP', quality=86, method=6, alpha_quality=90)

# anchors: the shoulder is where the sand first reaches 97% of its widest row
widths = {y: rows[y][1] - rows[y][0] for y in range(top, bot + 1) if y in rows}
wmax = max(widths.values())
shoulder = next(y for y in sorted(widths) if widths[y] >= 0.97 * wmax)
# the floor is an ellipse seen from a little above: the middle of the bottom edge hangs lower than
# its sides; its sag over the half-width gives the view's tilt for curving the layers
centre = (rows[bot - 30][0] + rows[bot - 30][1]) / 2
col = alpha[:, int(centre)]
bc = int(np.where(col > 0.5)[0].max())
side_x = int(centre + 0.8 * wmax / 2)
bs = int(np.where(alpha[:, side_x] > 0.5)[0].max())
k = (bc - bs) / ((wmax / 2) * (1 - np.sqrt(1 - 0.8 ** 2)) + 1e-3)
k = float(np.clip(k, 0, 0.35))
meta = {
    'size': [OW, OH], 'box': [bx0, by0, bx1 - bx0, by1 - by0],
    'top': top, 'shoulder': shoulder, 'bottom': bc, 'sag': round(k, 3), 'centre': round(float(centre), 1),
    'rows': [[rows[y][0], rows[y][1]] if y in rows else None for y in range(top, bot + 1)],
}
body = json.dumps(meta, separators=(',', ':'))
if META.suffix == '.js':
    body = ('// Generated by design/works/sand/scripts/build_scene.py: where the sand sits in the windowsill photo.\n'
            'export default ' + body + ';\n')
META.write_text(body, encoding='utf-8')
print('box', meta['box'], 'top', top, 'shoulder', shoulder, 'bottom', bc, 'sag', round(k, 3), 'wmax', wmax)
for n in ('sill.webp', 'sill-sand.webp', 'sill-glint.webp'):
    print(n, (OUT / n).stat().st_size // 1024, 'KB')

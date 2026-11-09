"""Cut a generated photo shot on coloured paper into an RGBA webp that sits on the page's own field
colour (dev tool, not deployed).

    python -I cutout.py <in.jpg> <out-base> [--width 1400] [--grad 0.09] [--pot] [--pad 0.10]
                        [--shadow 1.0] [--widths 1400,700] [--q 82]

How it works
- The paper is smooth, objects have edges. Edge strength is measured on a lightly blurred copy, and
  the paper is the largest smooth region that touches the frame border (a magic wand that follows the
  paper's own light falloff instead of one fixed colour).
- The light on the paper (L) is estimated from paper pixels only, twice: the second pass ignores the
  darker shadow pixels, so L is the lit paper and the shadow is what falls below it.
- Paper becomes transparent. Its shadow becomes black with alpha = 1 - (paper luminance / L), so on
  the page the shadow darkens exactly the CSS field colour, whatever it is. Everything that is not
  paper (the pot, the anchovies...) stays opaque in its own colour with a 1 px feathered edge.
- --pot keeps only the biggest object (the pot) and crops a square around it with --pad margin, so
  the four pots come out at the same scale.
Writes <out-base>-<w>.webp for each width and prints sizes.
"""
import argparse
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('base')
ap.add_argument('--width', type=int, default=1400)
ap.add_argument('--grad', type=float, default=0.09)
ap.add_argument('--pot', action='store_true')
ap.add_argument('--pad', type=float, default=0.10)
ap.add_argument('--shadow', type=float, default=1.0)
ap.add_argument('--maxshadow', type=float, default=0.6)
ap.add_argument('--dead', type=float, default=0.10, help='paper this much darker than L still counts as lit')
ap.add_argument('--widths', default='1400,700')
ap.add_argument('--q', type=int, default=82)
ap.add_argument('--minobj', type=int, default=6)
ap.add_argument('--minpocket', type=float, default=0.0008)
ap.add_argument('--pocket', type=float, default=0.08, help='max colour difference for a paper pocket')
ap.add_argument('--crop', help='x0,y0,x1,y1 in source pixels, applied first')
ap.add_argument('--debug')
ap.add_argument('--debugbg', default='#B3112E')
a = ap.parse_args()

im = Image.open(a.src).convert('RGB')
if a.crop:
    im = im.crop(tuple(int(v) for v in a.crop.split(',')))
if im.width > a.width:
    im = im.resize((a.width, round(im.height * a.width / im.width)), Image.LANCZOS)
P = np.asarray(im).astype(np.float32) / 255.0
H, W, _ = P.shape
lum = P @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)

# 1. edge strength, relative to local brightness so dark paper (pepper) and light paper behave alike
sm = ndi.gaussian_filter(P, sigma=(1.2, 1.2, 0))
gx = np.stack([ndi.sobel(sm[..., c], axis=1) for c in range(3)], -1)
gy = np.stack([ndi.sobel(sm[..., c], axis=0) for c in range(3)], -1)
grad = np.sqrt((gx ** 2 + gy ** 2).sum(-1)) / 8.0
base = ndi.gaussian_filter(lum, 6) + 0.08
edge = grad / base > a.grad

# 2. the paper: largest smooth component touching the border
smooth = ~ndi.binary_dilation(edge, iterations=1)
lab, n = ndi.label(smooth)
border = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
ids, counts = np.unique(border[border > 0], return_counts=True)
paper_id = ids[np.argmax(counts)]
paper = lab == paper_id


def fill(src, mask, sigma):
    m = mask.astype(np.float32)
    num = np.stack([ndi.gaussian_filter(src[..., c] * m, sigma) for c in range(3)], -1)
    den = ndi.gaussian_filter(m, sigma)[..., None]
    return num / np.maximum(den, 1e-4)


if a.pot:
    # paper seen through a handle loop is cut off from the rest: smooth pockets that match the
    # surrounding paper colour closely are paper too (red broth on red paper does not match closely)
    L0 = fill(P, paper, max(H, W) * 0.05)
    rel = np.abs(P - L0).max(-1) / np.maximum(L0.max(-1), 0.05)
    cand = ndi.binary_opening(~paper & (rel < a.pocket), iterations=2)
    labp, npk = ndi.label(cand)
    if npk:
        szp = ndi.sum(cand, labp, index=np.arange(1, npk + 1))
        for i in np.where(szp > a.minpocket * H * W)[0] + 1:
            paper |= ndi.binary_dilation(labp == i, iterations=2) & ~edge | (labp == i)
        if a.debug:
            print('pockets', int((szp > a.minpocket * H * W).sum()), 'largest', int(szp.max()))

sig = max(H, W) * 0.05
L1 = fill(P, paper, sig)
l1 = L1 @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
lit = paper & (lum > l1 * 0.93)
L = fill(P, lit, sig)
lL = L @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)

# 3. objects: everything that is not paper; drop specks, optionally keep only the pot
obj = ~paper
lab2, n2 = ndi.label(obj)
sizes = ndi.sum(obj, lab2, index=np.arange(1, n2 + 1))
if a.pot:
    # split things that only just touch (a handle near a window frame), keep the biggest, grow it back
    er = ndi.binary_erosion(obj, iterations=4)
    lab3, n3 = ndi.label(er)
    sz3 = ndi.sum(er, lab3, index=np.arange(1, n3 + 1))
    core = lab3 == (np.argmax(sz3) + 1)
    obj = ndi.binary_fill_holes(ndi.binary_dilation(core, iterations=5) & obj) & ~paper
else:
    keep_ids = np.where(sizes >= a.minobj)[0] + 1
    obj = np.isin(lab2, keep_ids)
    obj = ndi.binary_fill_holes(obj)
# soften: the edge band was counted as object; pull it in 1 px and feather
obj_a = ndi.gaussian_filter(ndi.binary_erosion(obj, iterations=1).astype(np.float32), 0.9)
obj_a = np.clip(np.maximum(obj_a, ndi.binary_erosion(obj, iterations=2)), 0, 1)

# 4. shadow on the paper
s = np.clip(lum / np.maximum(lL, 1e-4), 0, 1.5)
# a small dead zone so paper grain and leftover falloff stay fully transparent
sh = np.clip((1.0 - s - a.dead) / (1 - a.dead) * a.shadow, 0, a.maxshadow)
sh = ndi.gaussian_filter(sh, 2.0)
sh[obj_a >= 0.999] = 0
sh[sh < 0.02] = 0

A = obj_a + (1 - obj_a) * sh
rgb = np.where(A[..., None] > 1e-4, (obj_a[..., None] * P) / np.maximum(A[..., None], 1e-4), 0)
out = np.dstack([np.clip(rgb, 0, 1), np.clip(A, 0, 1)])
img = Image.fromarray((out * 255 + 0.5).astype(np.uint8))

if a.pot:
    ys, xs = np.where(obj)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    side = max(xs.max() - xs.min(), ys.max() - ys.min()) * (1 + 2 * a.pad)
    box = [round(cx - side / 2), round(cy - side / 2), round(cx + side / 2), round(cy + side / 2)]
    canvas = Image.new('RGBA', (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
    canvas.paste(img.crop((max(box[0], 0), max(box[1], 0), min(box[2], W), min(box[3], H))),
                 (max(-box[0], 0), max(-box[1], 0)))
    img = canvas
    print('pot box', box, 'pot diameter px', xs.max() - xs.min())

if a.debug:
    dbg = np.zeros((H, W, 3), np.uint8)
    dbg[paper] = (40, 160, 40)
    dbg[obj] = (230, 230, 230)
    dbg[edge] = (220, 40, 40)
    Image.fromarray(dbg).save(a.debug)
    prev = Image.new('RGBA', img.size, tuple(int(a.debugbg[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
    prev.alpha_composite(img)
    prev.convert('RGB').save(a.debug.replace('.png', '-comp.png'))

for w in [int(x) for x in a.widths.split(',')]:
    if w > img.width * 1.05:
        print('skip', w, '(source only', img.width, 'px)')
        continue
    o = img if w == img.width else img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
    fn = f'{a.base}-{w}.webp'
    o.save(fn, 'WEBP', quality=a.q, method=6, alpha_quality=90)
    print(fn, o.size, f'{os.path.getsize(fn) / 1024:.0f} KB')

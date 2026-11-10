"""Flatten a generated studio backdrop to the page colour (dev tool, not deployed).

    python -I grade.py <src> <out.png> --target FFE14D --box x0,y0,x1,y1 [--box ...] [--margin .05] [--feather .08]

1. Fits a smooth surface (2nd-order polynomial per channel) to the backdrop, re-fitting while it
   drops pixels that differ from the fit (objects, shadows).
2. Divides the image by that surface and multiplies by the target colour: the paper becomes the
   target colour everywhere, and objects keep their own light and shadow relative to it.
3. Away from the objects (outside the boxes plus margin, and outside anything that still differs
   from the paper, such as a cast shadow) the pixels are set to exactly the target colour, with a
   soft feather, so the photograph's edge disappears into the page.
Boxes are fractions of width and height.
"""
import argparse

import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('out')
ap.add_argument('--target', default='FFE14D')
ap.add_argument('--box', action='append', default=[])
ap.add_argument('--margin', type=float, default=0.05)
ap.add_argument('--feather', type=float, default=0.08)
ap.add_argument('--thresh', type=float, default=14.0)
ap.add_argument('--neutral', type=float, default=0.6, help='how much colour cast to remove from neutral parts')
ap.add_argument('--near', type=float, default=0.1, help='keep differing areas (shadows) only this close to a box')
ap.add_argument('--local', type=float, default=0.025, help='blur radius of the local paper estimate (fraction of size)')
ap.add_argument('--edge', type=float, default=0.03, help='band along the border forced to the target')
ap.add_argument('--sat', type=float, default=1.0, help='saturation of the objects after flattening')
a = ap.parse_args()

im = np.asarray(Image.open(a.src).convert('RGB')).astype(np.float64)
H, W, _ = im.shape
target = np.array([int(a.target[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)

# work on a small copy for the fit
s = 256 / max(H, W)
small = np.asarray(Image.fromarray(im.astype(np.uint8)).resize((int(W * s), int(H * s)), Image.LANCZOS)).astype(np.float64)
h, w, _ = small.shape
yy, xx = np.mgrid[0:h, 0:w]
X = xx / w - 0.5
Y = yy / h - 0.5
A = np.stack([np.ones_like(X), X, Y, X * X, X * Y, Y * Y, X ** 3, Y ** 3, X * X * Y, X * Y * Y], -1).reshape(-1, 10)

boxmask = np.zeros((h, w), bool)
for b in a.box:
    x0, y0, x1, y1 = [float(v) for v in b.split(',')]
    boxmask[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = True

keep = ~boxmask.reshape(-1)
pix = small.reshape(-1, 3)
for _ in range(4):
    coef, *_ = np.linalg.lstsq(A[keep], pix[keep], rcond=None)
    fit = A @ coef
    res = np.abs(pix - fit).sum(1)
    keep = (~boxmask.reshape(-1)) & (res < a.thresh)
diff_small = (res >= a.thresh).reshape(h, w)

# full-resolution surface
YY, XX = np.mgrid[0:H, 0:W]
XF = XX / W - 0.5
YF = YY / H - 0.5
AF = np.stack([np.ones_like(XF), XF, YF, XF * XF, XF * YF, YF * YF, XF ** 3, YF ** 3, XF * XF * YF, XF * YF * YF], -1)
surf_poly = (AF @ coef).reshape(H, W, 3)
# local backdrop estimate: normalised convolution of the paper outside the boxes, so the paper's
# own light falloff right next to the objects is followed closely; deep inside a box (where no
# paper is near) it falls back to the polynomial.
sig = a.local * max(h, w)
near = ndimage.distance_transform_edt(~boxmask) / max(h, w) < a.near
obj = boxmask | (ndimage.binary_opening(diff_small, iterations=1) & near)
M = (~ndimage.binary_dilation(obj, iterations=2)).astype(np.float64)
den = ndimage.gaussian_filter(M, sig)
num = np.stack([ndimage.gaussian_filter(small[..., c] * M, sig) for c in range(3)], -1)
nc = num / np.maximum(den, 1e-6)[..., None]
poly_small = fit.reshape(h, w, 3)
wl = np.clip(den / 0.35, 0, 1)[..., None]
est_small = nc * wl + poly_small * (1 - wl)
corr_small = est_small - poly_small               # smooth correction on top of the polynomial
corr = np.stack([np.asarray(Image.fromarray(corr_small[..., c].astype(np.float32), 'F').resize((W, H), Image.BILINEAR)) for c in range(3)], -1)
surf = surf_poly + corr
gain = target / np.maximum(surf, 1)                 # per-channel: paper and lemon plastic
flat_c = im * gain
lum = np.array([0.2126, 0.7152, 0.0722])
flat_l = im * (gain @ lum)[..., None]                # luminance only: white and black parts
mx, mn = im.max(-1), im.min(-1)
sat = (mx - mn) / np.maximum(mx, 1)
n = np.clip(1 - sat / 0.28, 0, 1)[..., None]         # 1 = neutral (white body, black parts)
g = flat_l.mean(-1, keepdims=True)
flat_l = g + (flat_l - g) * (1 - a.neutral)
flat = flat_c * (1 - n) + flat_l * n
if a.sat != 1.0:
    g = flat.mean(-1, keepdims=True)
    flat = g + (flat - g) * a.sat
flat = np.clip(flat, 0, 255)

# weight: 1 on objects (+margin), 0 on open paper
dist = ndimage.distance_transform_edt(~obj) / max(h, w)
wgt = np.clip(1 - (dist - a.margin) / a.feather, 0, 1)
wgt = wgt * wgt * (3 - 2 * wgt)
if a.edge > 0:   # the photograph's own border always ends in exactly the page colour
    by, bx = np.mgrid[0:h, 0:w]
    bd = np.minimum(np.minimum(bx, w - 1 - bx) / w, np.minimum(by, h - 1 - by) / h)
    e = np.clip((bd - a.edge * 0.25) / (a.edge * 0.75), 0, 1)
    wgt = wgt * e * e * (3 - 2 * e)
wgt = np.asarray(Image.fromarray((wgt * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)).astype(np.float64)[..., None] / 255
out = flat * wgt + target * (1 - wgt)
Image.fromarray(np.round(out).astype(np.uint8)).save(a.out)
edges = {"top": out[0], "bottom": out[-1], "left": out[:, 0], "right": out[:, -1]}
edge = np.concatenate(list(edges.values()))
print("  per edge max dev", {k: float(np.abs(v - target).max().round(1)) for k, v in edges.items()})
print(a.out, W, H, 'edge mean', edge.mean(0).round(1), 'edge max dev', np.abs(edge - target).max().round(1))

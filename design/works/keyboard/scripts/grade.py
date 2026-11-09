"""Flatten a studio photo's backdrop to one page colour (dev tool, not deployed).

    python -I grade.py <in> <out.png> <#target> <box> [<box> ...] [--deg 2]

Each box is x0,y0,x1,y1 in fractions of the image and must contain only backdrop paper.
The backdrop colour is fitted per channel with a low-order polynomial in (x, y); the whole
image is then multiplied by target / fit, so light fall-off and vignetting on the paper go
away while local shading (shadows, the product's own light) stays. The result is a photo
whose paper is the page's field colour, so it can sit in the page without a visible edge.
Prints the backdrop mean and spread before and after.
"""
import argparse

import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('out')
ap.add_argument('target')
ap.add_argument('boxes', nargs='+')
ap.add_argument('--deg', type=int, default=2)
ap.add_argument('--blur', type=float, default=0.0,
                help='instead of a polynomial, a mask-weighted Gaussian of this width (fraction of image width)')
a = ap.parse_args()

im = Image.open(a.src).convert('RGB')
W, H = im.size
arr = np.asarray(im).astype(np.float64)
target = np.array([int(a.target[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float64)

# sample backdrop on a coarse grid (box-averaged cells smooth the film grain)
cell = 16
small = np.asarray(im.resize((W // cell, H // cell), Image.BOX)).astype(np.float64)
sh, sw = small.shape[:2]
ys, xs = np.mgrid[0:sh, 0:sw]
mask = np.zeros((sh, sw), bool)
for b in a.boxes:
    x0, y0, x1, y1 = [float(v) for v in b.split(',')]
    mask[int(y0 * sh):int(y1 * sh), int(x0 * sw):int(x1 * sw)] = True


def design(x, y):
    cols = []
    for i in range(a.deg + 1):
        for j in range(a.deg + 1 - i):
            cols.append((x ** i) * (y ** j))
    return np.stack(cols, axis=-1)


u = (xs + 0.5) / sw
v = (ys + 0.5) / sh


def gblur(x, sigma):
    r = int(3 * sigma) + 1
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    pad = np.pad(x, ((r, r), (r, r)), mode='edge')
    tmp = np.apply_along_axis(lambda m: np.convolve(m, k, mode='valid'), 0, pad)
    return np.apply_along_axis(lambda m: np.convolve(m, k, mode='valid'), 1, tmp)


fit = np.zeros((sh, sw, 3))
if a.blur > 0:
    # normalised convolution: backdrop-only average, extrapolated smoothly under the product
    sigma = a.blur * sw
    wsum = gblur(mask.astype(np.float64), sigma)
    for c in range(3):
        fit[..., c] = gblur(small[..., c] * mask, sigma) / np.clip(wsum, 1e-6, None)
else:
    A = design(u[mask], v[mask])
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, small[..., c][mask], rcond=None)
        fit[..., c] = design(u, v) @ coef
before = small[mask]
print('backdrop before', before.mean(0).round(1), 'spread', before.std(0).round(1))

gain = target / np.clip(fit, 1, None)
gain_img = np.stack([np.asarray(Image.fromarray(gain[..., c].astype(np.float32)).resize((W, H), Image.BICUBIC))
                     for c in range(3)], axis=-1)
out = np.clip(arr * gain_img, 0, 255).astype(np.uint8)
Image.fromarray(out).save(a.out)

chk = np.asarray(Image.fromarray(out).resize((sw, sh), Image.BOX)).astype(np.float64)[mask]
print('backdrop after ', chk.mean(0).round(1), 'spread', chk.std(0).round(1), 'target', target)

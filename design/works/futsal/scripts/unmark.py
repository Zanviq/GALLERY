"""Paint out small dark logo marks on white fabric (socks) in a generated photo (dev tool).

    python -I unmark.py <src> <out> --box x0,y0,x1,y1 [--box ...] [--thr 120] [--max-area 900]

Inside each box, a pixel is a mark when it is dark (luminance < thr) while its 31 px neighbourhood
is mostly bright (mean luminance > 170), i.e. a small dark shape sitting on white cloth. Marks are
kept only as small connected blobs (area < max-area), grown by 3 px, then filled by normalised
convolution from the surrounding unmasked pixels, so the cloth's own shading carries across.
"""
import argparse

import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('out')
ap.add_argument('--box', action='append', required=True)
ap.add_argument('--thr', type=float, default=120)
ap.add_argument('--max-area', type=int, default=900)
a = ap.parse_args()

im = np.asarray(Image.open(a.src).convert('RGB')).astype(np.float32)
lum = 0.2126 * im[..., 0] + 0.7152 * im[..., 1] + 0.0722 * im[..., 2]
mask = np.zeros(lum.shape, bool)
for b in a.box:
    x0, y0, x1, y1 = [int(v) for v in b.split(',')]
    sub = lum[y0:y1, x0:x1]
    local = ndimage.uniform_filter(sub, 31)
    m = (sub < a.thr) & (local > 170)
    lab, n = ndimage.label(m)
    if n:
        areas = ndimage.sum(m, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, s in enumerate(areas) if s < a.max_area])
        mask[y0:y1, x0:x1] |= keep
mask = ndimage.binary_dilation(mask, iterations=3)
w = (~mask).astype(np.float32)
out = im.copy()
for c in range(3):
    num = ndimage.gaussian_filter(im[..., c] * w, 6)
    den = ndimage.gaussian_filter(w, 6)
    fill = num / np.maximum(den, 1e-4)
    out[..., c] = np.where(mask, fill, im[..., c])
Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8)).save(a.out)
print(a.out, 'masked px', int(mask.sum()))

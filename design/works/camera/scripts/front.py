"""Grade the straight-on camera photograph for the black shutter section (dev tool, not deployed).

    python -I front.py <src> <out.png>

Black point to exact #000, lemon body balanced toward #FFE14D while white and black parts keep
their own colour, cropped to the camera plus a 40 px black margin. Prints the crop box and the
positions the page needs (as fractions of the cropped image).
"""
import sys

import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
gain = np.array([255 / 243, 225 / 205, 77 / 83])
mx, mn = im.max(-1), im.min(-1)
sat = (mx - mn) / np.maximum(mx, 1)
n = np.clip(1 - sat / 0.28, 0, 1)[..., None]
lum = gain @ np.array([0.2126, 0.7152, 0.0722])
im = im * gain * (1 - n) + im * lum * n
im = np.clip((im - 5) * 255 / 250, 0, 255)          # background noise (max 4) to exact black
L = im.mean(-1)
ys, xs = np.where(L > 8)
x0, y0, x1, y1 = xs.min() - 40, ys.min() - 40, xs.max() + 40, ys.max() + 40
crop = im[y0:y1, x0:x1]
Image.fromarray(np.round(crop).astype(np.uint8)).save(out)
H, W = crop.shape[:2]
print('crop', x0, y0, x1, y1, 'size', W, H)
print('body left/right/top/bottom', (xs.min() - x0) / W, (xs.max() - x0) / W, (ys.min() - y0) / H, (ys.max() - y0) / H)
edge = np.concatenate([crop[0], crop[-1], crop[:, 0], crop[:, -1]])
print('edge max', edge.max())

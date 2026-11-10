"""Cut generated kite photographs out of their sky-blue backdrop, cut the sky out of the field photo,
and grade/export every image the page uses (dev tool, not deployed).

    python -I design/works/kite/scripts/cutout.py <gen-dir> [name ...]

Kites and the reel were shot (generated) in front of a sky-blue paper backdrop close to the page's
--sky, so any spill left on an edge is the page colour anyway. The backdrop is modelled as a smooth
colour field (quadratic in x and y, fitted to clearly-blue pixels), a pixel's alpha comes from its
distance to that field, and edge colours are un-mixed from the backdrop. The field photo's sky is
removed by scanning each column down from the top while the pixel still matches a fitted sky
gradient, so the page's flat sky continues into the photograph.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
OUT = os.path.join(ROOT, 'works', 'kite', 'img')
SKY = np.array([0x59, 0xB7, 0xF0], dtype=np.float32)


def hsv(a):
    mx = a.max(-1)
    mn = a.min(-1)
    d = mx - mn + 1e-6
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / (mx + 1e-6), 0)
    return h, s, mx


def fit_field(a, mask, deg=2):
    """Least-squares polynomial colour field in (x, y) fitted where mask is true."""
    H, W, _ = a.shape
    ys, xs = np.nonzero(mask)
    step = max(1, len(xs) // 60000)
    xs, ys = xs[::step], ys[::step]
    def basis(x, y):
        x = x / W - .5
        y = y / H - .5
        cols = [np.ones_like(x)]
        for i in range(1, deg + 1):
            for j in range(i + 1):
                cols.append(x ** (i - j) * y ** j)
        return np.stack(cols, -1)
    A = basis(xs.astype(np.float32), ys.astype(np.float32))
    coef = [np.linalg.lstsq(A, a[ys, xs, c], rcond=None)[0] for c in range(3)]
    gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
    B = basis(gx, gy)
    return np.stack([B @ c for c in coef], -1)


def key(a, lo=26.0, hi=70.0, erase=(), hull=False):
    """Alpha from distance to a fitted backdrop field + un-mixing of edge colours."""
    h, s, v = hsv(a / 255.0)
    clearly_bg = (h > 185) & (h < 222) & (s > .28) & (v > .45)
    bg = fit_field(a, clearly_bg)
    dist = np.sqrt(((a - bg) ** 2).sum(-1))
    alpha = np.clip((dist - lo) / (hi - lo), 0, 1)
    # any clearly blue pixel is backdrop (in shadow, or seen through the centre hole), not the object:
    # the paper is near-neutral, bamboo yellow, paint red or black
    blue = (h > 185) & (h < 225)
    alpha = np.where(blue, np.minimum(alpha, np.clip((.32 - s) / .1, 0, 1)), alpha)
    for (x0, y0, x1, y1) in erase:
        alpha[y0:y1, x0:x1] = 0
    am = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))
    alpha = np.asarray(am).astype(np.float32) / 255
    # The object is one solid piece: keep the largest component, make everything enclosed by it opaque
    # (translucent hanji in shadow must not let the page through), except real backdrop seen through
    # the centre hole. Specks of backdrop texture away from the object are dropped.
    lab, n = ndi.label(alpha > .5, structure=np.ones((3, 3)))
    if n:
        sizes = ndi.sum(np.ones_like(alpha), lab, range(1, n + 1))
        main = lab == (1 + int(np.argmax(sizes)))
        inside = ndi.binary_fill_holes(main)
        if hull:
            # flat kites are convex: the soft, translucent paper edge is still kite, not page
            import cv2
            pts = cv2.convexHull(np.argwhere(main)[:, ::-1].astype(np.int32))
            hm = np.zeros(main.shape, np.uint8)
            cv2.fillPoly(hm, [pts], 1)
            inside = hm.astype(bool)
        hole_bg = blue & (s > .38) & (dist < hi * 1.2)
        near = ndi.binary_dilation(inside, iterations=4)
        core = ndi.binary_erosion(inside & ~hole_bg, iterations=2)
        alpha = np.where(near, alpha, 0)
        alpha = np.where(core, 1, alpha)
    a3 = alpha[..., None]
    fg = np.where(a3 > .02, (a - (1 - a3) * bg) / np.maximum(a3, .02), a)
    fg = np.clip(fg, 0, 255)
    return fg, alpha


def trim(fg, alpha, pad=8):
    ys, xs = np.nonzero(alpha > .04)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, alpha.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, alpha.shape[1])
    return fg[y0:y1, x0:x1], alpha[y0:y1, x0:x1], (x0, y0)


def save_rgba(fg, alpha, base, widths, q=82):
    im = Image.fromarray(np.dstack([fg, alpha * 255]).astype(np.uint8))
    outs = []
    for w in widths:
        w2 = min(w, im.width)
        h2 = round(im.height * w2 / im.width)
        p = f'{base}-{w2}.webp'
        im.resize((w2, h2), Image.LANCZOS).save(p, 'WEBP', quality=q, alpha_quality=90, method=6)
        outs.append((p, w2, h2))
    for p, w2, h2 in outs:
        print(f'  {os.path.relpath(p, ROOT)}  {w2}x{h2}  {os.path.getsize(p) // 1024} KB')
    return im


def grade(fg, sat=1.0, gain=1.0, lift=0.0, warm=0.0):
    """Saturation, exposure, lift; warm<0 cools (less red, more blue)."""
    g = fg.mean(-1, keepdims=True)
    out = g + (fg - g) * sat
    out = out * gain + lift
    out[..., 0] += warm * 255 * .5
    out[..., 2] -= warm * 255 * .5
    return np.clip(out, 0, 255)


KITES = {
    # name: (source, sprite widths, erase rects in source px, grading)
    'chima': ('chima', (900, 520), ((860, 0, 940, 348),), dict(sat=1.04)),
    'banda': ('banda', (520,), ((860, 0, 940, 348),), dict()),
    'gaori': ('gaori', (900, 480), (), dict(sat=1.12, gain=1.12)),
    'kkori': ('kkori', (480,), (), dict()),
    'akmagi': ('akmagi', (560,), ((860, 0, 940, 348),), dict()),
    'eolle': ('eolle', (1000, 600), (), dict(sat=.92)),
}


def find(gen, stem):
    for ext in ('.png', '.jpg', '.jpeg'):
        p = os.path.join(gen, stem + ext)
        if os.path.exists(p):
            return p
    raise FileNotFoundError(stem)


def do_kite(gen, name):
    src, widths, erase, gr = KITES[name]
    a = np.asarray(Image.open(find(gen, src)).convert('RGB')).astype(np.float32)
    fg, alpha = key(a, erase=erase, hull=name != 'eolle')
    fg = grade(fg, **gr)
    fg, alpha, off = trim(fg, alpha)
    print(name, 'trimmed at', off, 'size', alpha.shape[::-1])
    im = save_rgba(fg, alpha, os.path.join(OUT, name), widths)
    # a contact sheet on the page colour and on red, to check the edges at full size
    sheet = Image.new('RGB', (im.width * 2, im.height), tuple(int(c) for c in SKY))
    sheet.paste(im, (0, 0), im)
    red = Image.new('RGB', im.size, (0xD7, 0x14, 0x2C))
    red.paste(im, (0, 0), im)
    sheet.paste(red, (im.width, 0))
    sheet.save(os.path.join(gen, f'check-{name}.png'))


def do_field(gen):
    a = np.asarray(Image.open(find(gen, 'field')).convert('RGB')).astype(np.float32)
    H, W, _ = a.shape
    # crop: drop the far-right end (hazy structures on the horizon) and keep a 3:1 band
    a = a[:, : int(W * .86)]
    H, W, _ = a.shape
    # Sky = bright haze (v > .83) or clear blue in the upper part; the banks below are
    # clearly darker (v < .82), so each column is sky down to the first run of darker pixels.
    h, sat, v = hsv(a / 255.0)
    yy0 = np.arange(H)[:, None] / H
    is_sky = (v > .83) | ((h > 185) & (h < 232) & (sat > .22) & (yy0 < .4))
    # the distant hills are hazy blue and read as ghosts against a flat sky: drop them too, so the
    # horizon is the far bank (only above the bank line, so the river itself is never touched)
    is_sky |= (h > 180) & (h < 240) & (np.arange(H)[:, None] < 722)
    # each column: sky until the first run of 3 non-sky pixels below the top
    alpha = np.ones((H, W), np.float32)
    ns = ~is_sky
    run3 = ns & np.roll(ns, -1, 0) & np.roll(ns, -2, 0)
    first = np.argmax(run3, 0)
    first[~run3.any(0)] = H
    first = np.asarray(Image.fromarray(first.astype(np.float32)[None, :]).filter(ImageFilter.MedianFilter(5)))[0]
    yy = np.arange(H)[:, None]
    alpha = np.clip((yy - first[None, :] + 1.0) / 2.0, 0, 1).astype(np.float32)
    # grade the ground cooler: frost, not straw (BRIEF §2 bans beige grounds)
    fg = grade(a, sat=.55, gain=1.03, warm=-.035)
    top = int(max(first.min() - 6, 0))
    fg, alpha = fg[top:], alpha[top:]
    print('field: horizon from', top, 'size', alpha.shape[::-1])
    im = save_rgba(fg, alpha, os.path.join(OUT, 'field'), (2400, 1400, 800), q=78)
    sheet = Image.new('RGB', im.size, tuple(int(c) for c in SKY))
    sheet.paste(im, (0, 0), im)
    sheet.save(os.path.join(gen, 'check-field.png'))


def do_workshop(gen):
    im = Image.open(find(gen, 'workshop2')).convert('RGB')
    W, H = im.size
    # inside the felt mat only: no tent canvas, no snow
    box = (int(W * .11), int(H * .335), int(W * .915), int(H * .905))
    im = im.crop(box)
    a = grade(np.asarray(im).astype(np.float32), sat=.9, warm=-.02)
    im = Image.fromarray(a.astype(np.uint8))
    for w in (1600, 900):
        h = round(im.height * w / im.width)
        p = os.path.join(OUT, f'workshop-{w}.webp')
        im.resize((w, h), Image.LANCZOS).save(p, 'WEBP', quality=80, method=6)
        print(f'  {os.path.relpath(p, ROOT)}  {w}x{h}  {os.path.getsize(p) // 1024} KB')


if __name__ == '__main__':
    gen = sys.argv[1]
    names = sys.argv[2:] or list(KITES) + ['field', 'workshop']
    os.makedirs(OUT, exist_ok=True)
    for n in names:
        if n == 'field':
            do_field(gen)
        elif n == 'workshop':
            do_workshop(gen)
        else:
            do_kite(gen, n)

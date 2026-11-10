"""Grade the generated photographs for 이슥 and export them into works/lamp/img/ (dev tool, not deployed).

    python -I design/works/lamp/scripts/grade.py <raw dir>

<raw dir> holds the untouched Gemini outputs (IMAGES.md lists them). Every photograph sits on the
page's room black #0B0C0E, so its own black is matched to that value exactly:
  1. the backdrop is estimated (quadratic fit over dark, flat pixels, or a per-row profile where the
     table meets the backdrop) and subtracted, with a short toe so the backdrop reaches 0;
  2. the result is "screened" with the room colour, so 0 becomes #0B0C0E and highlights are kept;
  3. the outer edges are feathered into the room colour, so no frame edge can show.
The desk scene is split into light layers for the dial (see INTERACTION.md):
  off.webp      the room with the lamp off (darkened), graded as above;
  l2700/l4000/l5600.webp   on(T) - off, clipped at 0. The page draws off + b * light(T) with
  canvas 'lighter' compositing, so b = 1 reproduces the lit photograph exactly.
"""
import os
import sys

import numpy as np
from PIL import Image

RAW = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
OUT = os.path.join(ROOT, 'works', 'lamp', 'img')
os.makedirs(OUT, exist_ok=True)
ROOM = np.array([11, 12, 14], dtype=np.float32)


def load(name):
    return np.asarray(Image.open(os.path.join(RAW, name)).convert('RGB')).astype(np.float32)


def lum(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def quad_bg(a, thresh):
    """Quadratic surface per channel fitted to dark, flat pixels."""
    h, w, _ = a.shape
    y = lum(a)
    gy, gx = np.gradient(y)
    mask = (y < thresh) & (np.hypot(gx, gy) < 1.5)
    ys, xs = np.nonzero(mask[::4, ::4])
    ys, xs = ys * 4, xs * 4
    X = xs / w - 0.5
    Y = ys / h - 0.5
    A = np.stack([np.ones_like(X), X, Y, X * X, X * Y, Y * Y], 1)
    gx_, gy_ = np.meshgrid(np.arange(w) / w - 0.5, np.arange(h) / h - 0.5)
    B = np.stack([np.ones_like(gx_), gx_, gy_, gx_ * gx_, gx_ * gy_, gy_ * gy_], -1)
    bg = np.zeros_like(a)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, a[ys, xs, c], rcond=None)
        bg[..., c] = B @ coef
    return bg


def row_bg(a, x0, x1):
    """Per-row backdrop from a strip that holds only backdrop/table (handles the horizon step)."""
    prof = np.median(a[:, x0:x1], axis=1)  # h x 3
    k = 15
    pad = np.pad(prof, ((k, k), (0, 0)), mode='edge')
    sm = np.stack([np.convolve(pad[:, c], np.ones(2 * k + 1) / (2 * k + 1), mode='valid') for c in range(3)], 1)
    return np.repeat(sm[:, None, :], a.shape[1], axis=1)


def toe(x, t):
    """0 below 0, smooth start up to t, identity-shifted above."""
    x = np.maximum(x, 0)
    return np.where(x < 2 * t, x * x / (4 * t), x - t)


def screen_room(a):
    return ROOM + a * (1 - ROOM / 255.0)


def feather(a, frac=(0.05, 0.05, 0.05, 0.05), target=None):
    """Blend the outer band (left, top, right, bottom fractions) into target (default room)."""
    h, w, _ = a.shape
    xs = np.arange(w) / w
    ys = np.arange(h) / h
    l, t, r, b = frac

    def ss(e0, e1, x):
        k = np.clip((x - e0) / max(e1 - e0, 1e-6), 0, 1)
        return k * k * (3 - 2 * k)
    mx = (ss(0, l, xs) if l else 1) * (ss(0, r, 1 - xs) if r else 1)
    my = (ss(0, t, ys) if t else 1) * (ss(0, b, 1 - ys) if b else 1)
    m = (my[:, None] * mx[None, :])[..., None]
    tgt = ROOM if target is None else target
    return a * m + tgt * (1 - m)


def save(a, name, widths, q=80, alpha=None):
    im = Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8))
    if alpha is not None:
        im.putalpha(Image.fromarray(np.clip(alpha * 255 + 0.5, 0, 255).astype(np.uint8)))
    for w in widths:
        h = round(im.height * w / im.width)
        out = os.path.join(OUT, f'{name}-{w}.webp')
        im.resize((w, h), Image.LANCZOS).save(out, 'WEBP', quality=q, method=6)
        print(f'{name}-{w}.webp {w}x{h} {os.path.getsize(out) // 1024} KB')


def on_black(a, bg, t=3.0):
    return screen_room(toe(a - bg, t))


# Hero: lamp on black. Backdrop/table from the left strip (pure backdrop).
hero = load('hero-a.jpg')
g = on_black(hero, row_bg(hero, 0, 260) + 1.5)
desk = g[:, 700:2528]           # lamp + its pool, room for the title on the left of the page
save(feather(desk, (0.10, 0.04, 0.03, 0.06)), 'hero', [1600, 1000])
phone = g[0:1696, 880:2237]     # 4:5 around the lamp
save(feather(phone, (0.06, 0.04, 0.04, 0.06)), 'hero-m', [900])

# Side elevation (dimensions) and the lit head from below.
side = load('side-a.jpg')
save(feather(on_black(side, row_bg(side, 0, 160) + 1.5), (0.05, 0.05, 0.05, 0.05)), 'side', [1400, 800])
head = load('head-a.jpg')
save(feather(on_black(head, quad_bg(head, 14) + 1.0), (0.05, 0.05, 0.05, 0.05)), 'head', [1000, 640])

# Parts flat lay: the black surface carries a soft light fall-off; fit and remove it.
parts = load('parts-b.jpg')
save(feather(on_black(parts, quad_bg(parts, 80) + 2.0, 4.0), (0.04, 0.05, 0.04, 0.05)), 'parts', [1800, 900])

# Desk scene light layers.
def to_lin(a):
    a = a / 255.0
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def to_srgb(l):
    l = np.clip(l, 0, 1)
    return 255.0 * np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055)


h, w = 1696, 2528
X, Y = np.meshgrid(np.arange(w) / w, np.arange(h) / h)
# Lamp light falls off away from the head and the desk under it: keep the pool, calm the upper wall.
d = np.hypot((X - 0.42) / 0.60, (Y - 0.60) / 0.56)
V = (1 - 0.74 * np.clip((d - 0.40) / 0.80, 0, 1) ** 1.2)[..., None]
off_lin = to_lin(load("scene-off-a.jpg")) * 0.16          # the room is darker than the edit made it
OFF = feather(screen_room(to_srgb(off_lin)), (0.06, 0.07, 0.06, 0.08))
save(OFF, 'off', [1600, 1000], q=78)
for T in ('2700', '4000', '5600'):
    src = {'2700': 'scene-2700-a.jpg', '4000': 'scene-b.jpg', '5600': 'scene-5600-a.jpg'}[T]
    on_lin = to_lin(load(src))
    lit = off_lin + np.maximum(on_lin - off_lin, 0) * V
    ON = feather(screen_room(to_srgb(lit)), (0.06, 0.07, 0.06, 0.08))
    save(np.maximum(ON - OFF, 0), f'l{T}', [1600, 1000], q=80)
    if T == '4000':
        save(ON, 'scene', [1600], q=80)    # still for no-canvas fallback and captures

# Dial: the base around it is a static disc, the knurled dial on top turns.
dial = load('dial-a.jpg')
cx, cy = 1024, 1023
yy, xx = np.mgrid[0:2048, 0:2048]
rr = np.hypot(xx - cx, yy - cy)
R_PATCH, R_DIAL = 880, 530
patch = dial[cy - R_PATCH:cy + R_PATCH, cx - R_PATCH:cx + R_PATCH]
pr = rr[cy - R_PATCH:cy + R_PATCH, cx - R_PATCH:cx + R_PATCH]
save(patch * 0.92, 'base', [560], q=82, alpha=np.clip(R_PATCH - pr, 0, 1.5) / 1.5)
knob = dial[cy - R_DIAL:cy + R_DIAL, cx - R_DIAL:cx + R_DIAL]
kr = rr[cy - R_DIAL:cy + R_DIAL, cx - R_DIAL:cx + R_DIAL]
save(knob * 0.92, 'dial', [360], q=86, alpha=np.clip(R_DIAL - kr, 0, 1.5) / 1.5)

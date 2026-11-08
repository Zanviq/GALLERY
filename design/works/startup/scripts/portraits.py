"""Team portraits for 물길 — "Sounding Lines" (see ../PHILOSOPHY.md).

    python -I design/works/startup/scripts/portraits.py

Each portrait is a field of horizontal survey lanes. A lane thickens where it crosses
the figure (hair darkest, then body, then face), bows slightly over it like an echo
trace over a reef, and one orange lane marks the waterline at the same height in every
portrait. Nothing is outlined. Output: works/startup/img/team/<slug>.webp (480×560).
"""
import math
import pathlib
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[4]
OUT = ROOT / 'works' / 'startup' / 'img' / 'team'
S = 2                         # supersampling
W, H = 480 * S, 560 * S
BG = (234, 242, 245)
INK = (19, 41, 61)
SIGNAL = (226, 83, 28)
SPACING = 10 * S
WATERLINE = 47                # lane index of the orange line (same for everyone)

PEOPLE = [
    dict(slug='han-doyun', hair='short', glasses=True, dx=-6, head=(78, 98), shoulders=200, seed=3),
    dict(slug='seo-jimin', hair='long', glasses=False, dx=8, head=(72, 94), shoulders=180, seed=11),
    dict(slug='park-gyeongsu', hair='buzz', glasses=False, dx=0, head=(82, 100), shoulders=214, seed=5),
    dict(slug='kim-haneul', hair='tied', glasses=False, dx=-10, head=(74, 96), shoulders=184, seed=17),
    dict(slug='lee-roun', hair='curly', glasses=True, dx=4, head=(76, 96), shoulders=196, seed=23),
    dict(slug='jung-yunseo', hair='bob', glasses=False, dx=-2, head=(74, 94), shoulders=186, seed=29),
]

# tone levels (0 = open water … 1 = darkest)
T_FACE, T_NECK, T_BODY, T_HAIR, T_GLASS = 0.46, 0.4, 0.66, 1.0, 0.1


def ell(d, cx, cy, rx, ry, fill):
    d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=fill)


def tone_map(p):
    img = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(img)
    cx = 240 + p['dx']
    hx, hy = p['head']
    cy = 258
    v = lambda t: int(t * 255)
    sh = p['shoulders']
    hair = p['hair']
    # body first, then hair that falls on the shoulders, then the neck over it
    ell(d, cx, 646, sh, 236, v(T_BODY))
    if hair == 'long':
        d.rounded_rectangle([(cx - hx - 16) * S, (cy - 40) * S, (cx + hx + 16) * S, (cy + 176) * S], radius=40 * S, fill=v(T_HAIR))
    d.rounded_rectangle([(cx - 29) * S, (cy + 50) * S, (cx + 29) * S, (cy + 176) * S], radius=14 * S, fill=v(T_NECK))
    if hair == 'bob':
        d.rounded_rectangle([(cx - hx - 14) * S, (cy - 70) * S, (cx + hx + 14) * S, (cy + 84) * S], radius=46 * S, fill=v(T_HAIR))
    if hair == 'tied':
        ell(d, cx + 18, cy - hy - 6, 30, 26, v(T_HAIR))
    # ears and face
    ell(d, cx - hx + 2, cy + 6, 12, 20, v(T_FACE))
    ell(d, cx + hx - 2, cy + 6, 12, 20, v(T_FACE))
    ell(d, cx, cy, hx, hy, v(T_FACE))
    # hair on top of the head
    if hair == 'short':
        d.chord([(cx - hx - 6) * S, (cy - hy - 10) * S, (cx + hx + 6) * S, (cy + hy * 0.55) * S], 180, 360, fill=v(T_HAIR))
        ell(d, cx - 24, cy - hy * 0.42, 46, 22, v(T_HAIR))
    elif hair == 'buzz':
        d.chord([(cx - hx - 1) * S, (cy - hy - 3) * S, (cx + hx + 1) * S, (cy + hy * 0.3) * S], 180, 360, fill=v(T_HAIR * 0.82))
    elif hair == 'long':
        d.chord([(cx - hx - 10) * S, (cy - hy - 12) * S, (cx + hx + 10) * S, (cy + hy * 0.5) * S], 180, 360, fill=v(T_HAIR))
        ell(d, cx + 26, cy - hy * 0.45, 52, 24, v(T_HAIR))
    elif hair == 'tied':
        d.chord([(cx - hx - 4) * S, (cy - hy - 6) * S, (cx + hx + 4) * S, (cy + hy * 0.4) * S], 180, 360, fill=v(T_HAIR))
    elif hair == 'bob':
        d.chord([(cx - hx - 12) * S, (cy - hy - 14) * S, (cx + hx + 12) * S, (cy + hy * 0.62) * S], 180, 360, fill=v(T_HAIR))
        ell(d, cx - 10, cy - hy * 0.3, 70, 26, v(T_HAIR))
    elif hair == 'curly':
        rnd = random.Random(p['seed'])
        for k in range(26):
            a = math.pi + (k / 25) * math.pi
            rr = 1.02 + rnd.random() * 0.1
            x = cx + math.cos(a) * hx * rr
            y = cy - 4 + math.sin(a) * hy * rr * 0.98
            ell(d, x, y, 22 + rnd.random() * 8, 22 + rnd.random() * 8, v(T_HAIR))
        d.chord([(cx - hx) * S, (cy - hy - 4) * S, (cx + hx) * S, (cy + hy * 0.3) * S], 180, 360, fill=v(T_HAIR))
    # glasses: thin rings read as light circles inside the face
    if p['glasses']:
        for gx in (cx - 30, cx + 30):
            d.ellipse([(gx - 22) * S, (cy + 4 - 18) * S, (gx + 22) * S, (cy + 4 + 18) * S], outline=v(T_GLASS), width=5 * S)
        d.line([(cx - 9) * S, (cy + 2) * S, (cx + 9) * S, (cy + 2) * S], fill=v(T_GLASS), width=4 * S)
    img = img.filter(ImageFilter.GaussianBlur(2.2 * S))
    return np.asarray(img, dtype=np.float32) / 255.0


def render(p):
    tone = tone_map(p)
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    rnd = random.Random(p['seed'])
    ph = rnd.random() * 10
    lanes = H // SPACING + 1
    xs = np.arange(0, W + 2 * S, 2 * S, dtype=np.float32)
    for j in range(lanes):
        y0 = SPACING * 0.5 + j * SPACING
        if y0 > H + SPACING:
            break
        yi = int(min(H - 1, max(0, y0)))
        t = tone[yi, np.clip(xs.astype(int), 0, W - 1)]
        # sample a little above the lane too, so the bow follows the mass
        swell = 0.8 * S * np.sin(xs / (41 * S) + j * 0.63 + ph) + 0.32 * S * np.sin(xs / (13 * S) + j * 1.7)
        bow = -t * 3.2 * S
        yc = y0 + swell + bow
        thick = 0.95 * S + (t ** 1.15) * 7.6 * S
        # taper at the edges of the plate
        edge = np.clip(np.minimum(xs, W - xs) / (24 * S), 0, 1)
        thick = thick * (0.55 + 0.45 * edge)
        top = list(zip(xs.tolist(), (yc - thick / 2).tolist()))
        bot = list(zip(xs.tolist()[::-1], (yc + thick / 2).tolist()[::-1]))
        d.polygon(top + bot, fill=SIGNAL if j == WATERLINE else INK)
    img = img.resize((W // S, H // S), Image.LANCZOS)
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for p in PEOPLE:
        im = render(p)
        path = OUT / f"{p['slug']}.webp"
        im.save(path, 'WEBP', quality=82, method=6)
        print(path.name, path.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()

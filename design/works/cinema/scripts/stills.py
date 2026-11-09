"""Crop, grade and export the cinema stills and poster (dev tool, not deployed).

    python -I stills.py <raw dir> [name ...]      (all when no names; needs Pillow + numpy)

The raw generations (prompts in design/works/cinema/IMAGES.md) are kept outside the repo.

Grade: greyscale, levels from the 0.15% / 99.85% quantiles, a gamma per still, one shared fine grain so
the set matches. Retouch (not drawing): the "-off" variants darken a lit window, bulb or room the way
a closed shutter or a switched-off lamp would, and the fogged end of the roll burns light into a frame.
"""
import pathlib
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[4]
RAW = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('raw')
OUT = ROOT / 'works' / 'cinema' / 'img'
TIERS = (1600, 800, 400)

rs = np.random.default_rng(1966)


def load(name):
    return np.asarray(Image.open(RAW / name).convert('L'), dtype=np.float32)


def crop32(a, box=None, fy=0.5, fx=0.5):
    """box = (x0, y0, x1, y1) first, then the largest 3:2 window around (fx, fy)."""
    if box:
        a = a[box[1]:box[3], box[0]:box[2]]
    h, w = a.shape
    if w / h > 1.5:
        nw, nh = int(h * 1.5), h
    else:
        nw, nh = w, int(w / 1.5)
    x0 = min(max(int(fx * w - nw / 2), 0), w - nw)
    y0 = min(max(int(fy * h - nh / 2), 0), h - nh)
    return a[y0:y0 + nh, x0:x0 + nw]


def levels(a, gamma=1.0, lo_q=0.0015, hi_q=0.9985, black=4, white=250):
    lo, hi = np.quantile(a, [lo_q, hi_q])
    t = np.clip((a - lo) / max(1, hi - lo), 0, 1) ** gamma
    return black + t * (white - black)


def grain(a, amount=4.0):
    n = rs.normal(0, 1, a.shape).astype(np.float32)
    img = Image.fromarray(np.clip(n * 40 + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    n = (np.asarray(img, dtype=np.float32) - 128) / 40
    mid = 1 - np.abs(a / 255 - 0.45) * 1.3  # film grain shows most in the mid-tones
    return a + n * amount * np.clip(mid, 0.25, 1)


def soft_rect(shape, x0, y0, x1, y1, feather):
    m = np.zeros(shape, dtype=np.uint8)
    m[y0:y1, x0:x1] = 255
    img = Image.fromarray(m).filter(ImageFilter.GaussianBlur(feather))
    return np.asarray(img, dtype=np.float32) / 255


def export(a, name, tiers=TIERS, q=74):
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    out = []
    for t in tiers:
        w = min(t, im.width)
        h = round(im.height * w / im.width)
        p = OUT / f'{name}-{t}.webp'
        im.resize((w, h), Image.LANCZOS).save(p, 'WEBP', quality=q, method=6)
        out.append(f'{p.name} {w}x{h} {p.stat().st_size // 1024}KB')
    print(name, ' | '.join(out))


# ---------- the poster and the window it holds ----------

POSTER_PANE = (858, 800, 1002, 972)  # lit window in raw/poster.jpg


def poster_lit():
    return levels(load('poster.jpg'), gamma=1.08)


def poster_off(a):
    x0, y0, x1, y1 = POSTER_PANE
    pane = soft_rect(a.shape, x0, y0, x1, y1, 3)
    halo = soft_rect(a.shape, x0 - 30, y0 - 30, x1 + 30, y1 + 30, 26)
    dark = a * 0.12 + 7
    b = a * (1 - pane) + dark * pane
    # what the light was throwing on the wall around the frame
    return b * (1 - 0.18 * halo * (1 - pane))


def window_crop(a):
    # the top of the building from the stop: full width, window high in the frame
    return crop32(a, (0, 560, 1696, 1691))


def fogged(a):
    h, w = a.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    # light leaking in from the right edge of the roll, strongest at the top corner
    d = (w - xx) / w * 1.0 + yy / h * 0.35
    burn = np.clip(1.15 - d * 1.6, 0, 1) ** 1.6
    b = a + (255 - a) * burn
    return np.clip(b * 0.92 + 18, 0, 255)


def run(names):
    want = lambda n: not names or n in names
    if want('poster'):
        lit = poster_lit()
        export(grain(lit, 3.5), 'poster-lit', tiers=(1200, 700), q=76)
        export(grain(poster_off(lit), 3.5), 'poster-off', tiers=(1200, 700), q=76)
    if want('window'):
        lit = poster_lit()
        off = poster_off(lit)
        export(grain(window_crop(lit)), 'still-window')
        export(grain(window_crop(off)), 'still-window-off')
        export(grain(fogged(window_crop(off))), 'still-fogged')
    if want('place'):
        export(grain(levels(crop32(load('place-a2.jpg')), gamma=1.1)), 'still-place')
    if want('stairs'):
        a = levels(crop32(load('stairs.jpg'), (135, 0, 2392, 1696), fy=0.42), gamma=1.12)
        export(grain(a), 'still-stairs')
        # the landing bulb not yet on: everything sinks, the bulb glass stays a dull grey
        h, w = a.shape
        off = (a / 255) ** 1.9 * 255 * 0.34 + 3
        export(grain(off, 3), 'still-stairs-off')
    if want('room'):
        export(grain(levels(crop32(load('room.jpg'), (135, 0, 2392, 1696), fy=0.45), gamma=1.05)), 'still-room')
    if want('eunjae'):
        export(grain(levels(crop32(load('eunjae.jpg'), (135, 0, 2392, 1696), fy=0.3), gamma=1.0)), 'still-eunjae')
    if want('notebook'):
        export(grain(levels(crop32(load('notebook.jpg')), gamma=1.05)), 'still-notebook')
    if want('glass'):
        export(grain(levels(crop32(load('glass.jpg')), gamma=1.05)), 'still-glass')
    if want('driver'):
        export(grain(levels(crop32(load('driver2.jpg')), gamma=1.08)), 'still-driver')
    if want('two'):
        export(grain(levels(crop32(load('two.jpg')), gamma=1.05)), 'still-two')
    if want('switch'):
        a = levels(crop32(load('switch.jpg')), gamma=1.0)
        export(grain(a), 'still-switch')
        off = (a / 255) ** 2.1 * 255 * 0.3 + 3
        export(grain(off, 3), 'still-switch-off')
    if want('bus'):
        export(grain(levels(crop32(load('bus.jpg'), (280, 0, 2005, 1150)), gamma=1.05)), 'still-bus')
    if want('reach'):
        export(grain(levels(crop32(load('reach.jpg')), gamma=1.05)), 'still-reach')


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    run(set(sys.argv[2:]))

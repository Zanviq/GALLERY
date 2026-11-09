"""Crop, grade and export the generated photographs for works/nighttrain/img/.

    python -I design/works/nighttrain/scripts/grade.py [name ...]

Sources are the Gemini originals in the scratchpad (SRC below; see IMAGES.md for the prompts).
One grade for the whole set so the photographs belong to the page's two colours:
  - lamp and sun light is kept but pulled away from amber (orange/yellow hues lose ~45% saturation),
  - a slight cool white balance,
  - the deepest shadows lean toward the page's night blue (#1B2F6E) instead of neutral black,
  - highlights stay clean white (the sheets are the brightest thing in every frame).
Writes <name>-<w>.webp for each width, never upscaling.
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
OUT = os.path.join(ROOT, 'works', 'nighttrain', 'img')
SRC = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Temp', 'claude', '7e6ff043f79a9415',
                   'ab92f51c-d44a-48f8-b922-d120aba180a3', 'scratchpad', 'nighttrain', 'gen')

NIGHT = np.array([0x1B, 0x2F, 0x6E], dtype=np.float32) / 255

# name: (source, crop box in source px or None, widths, warm-taming strength)
SET = {
    'cabin-night': ('A-cabin-night.jpg', None, (1200, 720), 0.45),
    'cabin-single': ('A2-single.jpg', None, (1600, 800), 0.45),
    'cabin-double': ('H2-double.jpg', None, (1600, 800), 0.45),
    'cabin-four': ('I-couchette.jpg', None, (1600, 800), 0.45),
    'platform': ('C-platform.jpg', None, (1600, 800), 0.5),
    'reading': ('F-reading.jpg', None, (1200, 720), 0.45),
    'tea': ('D-tea.jpg', None, (1200, 720), 0.45),
    'dawn': ('B-cabin-dawn.jpg', None, (1600, 800), 0.3),
    'attendant': ('E-attendant.jpg', None, (1200, 720), 0.4),
    'arrival': ('G-arrival.jpg', None, (1600, 800), 0.6),
    'founder-yoon': ('P1-founder.jpg', None, (720, 400), 0.3),
    'founder-seo': ('P2-founder.jpg', None, (720, 400), 0.3),
    'founder-ma': ('P3-founder.jpg', None, (720, 400), 0.3),
}


def rgb_to_hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rr = m & (mx == r)
    gg = m & (mx == g) & ~rr
    bb = m & ~rr & ~gg
    h[rr] = ((g - b)[rr] / d[rr]) % 6
    h[gg] = (b - r)[gg] / d[gg] + 2
    h[bb] = (r - g)[bb] / d[bb] + 4
    h = h * 60
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def hsv_to_rgb(h, s, v):
    c = v * s
    x = c * (1 - np.abs((h / 60) % 2 - 1))
    m = v - c
    z = np.zeros_like(h)
    k = (h // 60).astype(int) % 6
    r = np.choose(k, [c, x, z, z, x, c])
    g = np.choose(k, [x, c, c, x, z, z])
    b = np.choose(k, [z, z, x, c, c, x])
    return np.stack([r + m, g + m, b + m], -1)


def grade(im, warm):
    a = np.asarray(im.convert('RGB'), dtype=np.float32) / 255
    # 1. pull orange/yellow (hue 15-60) away from amber
    h, s, v = rgb_to_hsv(a)
    w = np.clip(1 - np.abs(h - 37) / 26, 0, 1)
    s = s * (1 - warm * w)
    a = hsv_to_rgb(h, s, v)
    # 2. slightly cool white balance
    a = a * np.array([0.985, 1.0, 1.02], dtype=np.float32)
    # 3. deepest shadows lean to the night blue
    lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    t = (np.clip(1 - lum / 0.35, 0, 1) ** 2 * 0.22)[..., None]
    a = a * (1 - t) + NIGHT * t * np.maximum(lum[..., None] / 0.35 * 1.6, 0.35)
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def main(names):
    os.makedirs(OUT, exist_ok=True)
    for name in names or SET:
        src, box, widths, warm = SET[name]
        im = Image.open(os.path.join(SRC, src)).convert('RGB')
        if box:
            im = im.crop(box)
        top = min(widths[0], im.size[0])
        im = im.resize((top, round(im.size[1] * top / im.size[0])), Image.LANCZOS)
        im = grade(im, warm)
        for w in widths:
            w2 = min(w, im.size[0])
            h2 = round(im.size[1] * w2 / im.size[0])
            out = os.path.join(OUT, f'{name}-{w2}.webp')
            im.resize((w2, h2), Image.LANCZOS).save(out, 'WEBP', quality=78, method=6)
            print(f'{name}-{w2}.webp {w2}x{h2} {os.path.getsize(out) // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1:])

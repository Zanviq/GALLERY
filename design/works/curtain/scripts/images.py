"""Turn the generated photographs into the page's images (dev tool, not deployed).

    python -I design/works/curtain/scripts/images.py <gen dir> [velvet] [stage] [bulb]

velvet-a.jpg -> works/curtain/img/velvet.webp  (2048x1024 cloth texture; the seam sits at u = 0.5)
stage-c.jpg  -> works/curtain/img/stage-{2000,1200}.webp and stage-tall.webp (phone crop)
bulb-*.jpg   -> works/curtain/img/bulb-{1000,600}.webp
"""
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[4]
OUT = ROOT / 'works' / 'curtain' / 'img'
GEN = pathlib.Path(sys.argv[1])
OUT.mkdir(exist_ok=True)
LUM = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def arr(im):
    return np.asarray(im.convert('RGB')).astype(np.float32) / 255


def img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def save(im, name, q=80):
    p = OUT / name
    im.save(p, 'WEBP', quality=q, method=6)
    print(f'{name:22s} {im.size[0]}x{im.size[1]}  {p.stat().st_size / 1024:.0f} KB')


def neutral(a, sat, cool=0.0, black=0.0, gamma=1.0):
    """Mostly grey, a hint of cool, darks pulled to true black so the photo meets the page."""
    g = (a @ LUM)[..., None]
    a = g + (a - g) * sat
    a = a * np.array([1 - cool, 1, 1 + cool * 0.6], dtype=np.float32)
    return np.clip((a - black) / (1 - black), 0, 1) ** gamma


def fade_edges(a, top=0.0, bottom=0.0):
    H = a.shape[0]
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    m = np.ones((H, 1), np.float32)
    if top:
        m *= np.clip(y / top, 0, 1) ** 1.5
    if bottom:
        m *= np.clip((1 - y) / bottom, 0, 1) ** 1.5
    return a * m[..., None]


def velvet():
    a = arr(Image.open(GEN / 'velvet-a.jpg'))
    H, W, _ = a.shape
    col = (a @ LUM)[int(H * 0.1):int(H * 0.9)].mean(0)
    lo = int(W * 0.4)
    seam = lo + int(np.argmin(col[lo:int(W * 0.6)]))
    half = min(seam, W - seam)
    a = a[:, seam - half:seam + half]
    # toward the registry emerald (#0D5C47): less yellow, a touch more blue in the green
    a = a * np.array([0.72, 1.0, 1.13], dtype=np.float32)
    print('velvet crop', a.shape[1], 'x', a.shape[0], 'aspect', round(a.shape[1] / a.shape[0], 4), 'seam', seam)
    save(img(a).resize((2048, 1024), Image.LANCZOS), 'velvet.webp', 78)


def stage():
    a = arr(Image.open(GEN / 'stage-c.jpg'))
    H = a.shape[0]
    a = a[:int(H * 0.885)]                     # drop the row of seat backs below the stage edge
    a = neutral(a, sat=0.18, cool=0.04, black=0.035, gamma=1.05)
    a = fade_edges(a, top=0.12, bottom=0.05)
    im = img(a)
    for w in (2000, 1200):
        save(im.resize((w, round(im.size[1] * w / im.size[0])), Image.LANCZOS), f'stage-{w}.webp', 80)
    # phones and portrait tablets: a 1:2 crop around the lamp, with black above it so the lamp
    # stands in the lower half and the poster type has the dark top to itself
    h = im.size[1]
    w = round(h * 0.75)
    cx = round(im.size[0] * 0.64)
    x0 = max(0, min(im.size[0] - w, cx - w // 2))
    tall = Image.new('RGB', (w, h * 2), (0, 0, 0))
    tall.paste(im.crop((x0, 0, x0 + w, h)), (0, h))
    tall = tall.resize((1020, 2040), Image.LANCZOS)
    save(tall, 'stage-tall.webp', 80)
    print('stage size after crop', im.size)


def bulb():
    src = sorted(GEN.glob('bulb-*.jpg'))[-1]
    a = arr(Image.open(src))
    H, W, _ = a.shape
    a = a[int(H * 0.08):int(H * 0.72), int(W * 0.15):int(W * 0.85)]   # bring the cage closer
    im = img(neutral(a, sat=0.18, cool=0.04, black=0.035, gamma=1.05))
    print('bulb from', src.name, im.size)
    for w in (1000, 600):
        save(im.resize((w, round(im.size[1] * w / im.size[0])), Image.LANCZOS), f'bulb-{w}.webp', 80)


if __name__ == '__main__':
    for job in sys.argv[2:] or ['velvet', 'stage', 'bulb']:
        globals()[job]()

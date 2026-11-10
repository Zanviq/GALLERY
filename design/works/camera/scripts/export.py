"""Export the graded camera photographs and the eight prints as webp (dev tool, not deployed).

    python -I export.py <scratch-camera-dir> <works/camera/img>

Camera photographs: graded PNGs from grade.py / front.py, exported at two widths; after encoding the
corner pixels are decoded again and must equal the page colour within 2 levels.
Prints: 4:5 crops of the raw generations (inner image only, no generated border), 600x750.
"""
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

CAMERA = {
    # name: (graded file, widths, page colour the edges must match)
    'hero': ('graded/hero.png', (1600, 900), (255, 225, 77)),
    'trio': ('graded/trio.png', (1800, 900), (255, 225, 77)),
    'film': ('graded/film.png', (1400, 800), (255, 225, 77)),
    'front': ('graded/front.png', (1043, 600), (0, 0, 0)),
    'back': ('graded/back.png', (1600, 900), (255, 225, 77)),
}
PRINTS = {
    'rooftop': (60, 40, 1796, 2210),
    'cake': (235, 74, 1646, 1838),
    'lighthouse': (242, 135, 1591, 1821),
    'gate': (130, 123, 1491, 1824),
    'tangerine': (160, 170, 1696, 2090),
    'snow': (30, 30, 1826, 2275),
    'laundry': (150, 150, 1706, 2095),
    'ramyeon': (381, 129, 1747, 1836),
}


def save(im, path, q):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=q, method=6)
    path.write_bytes(buf.getvalue())
    return Image.open(io.BytesIO(buf.getvalue())).convert('RGB')


total = 0
for name, (f, widths, page) in CAMERA.items():
    im = Image.open(SRC / f).convert('RGB')
    for w in widths:
        w2 = min(w, im.width)
        h2 = round(im.height * w2 / im.width)
        out = OUT / f'{name}-{w2}.webp'
        back = np.asarray(save(im.resize((w2, h2), Image.LANCZOS), out, 84)).astype(int)
        corners = np.array([back[2, 2], back[2, -3], back[-3, 2], back[-3, -3]])
        dev = np.abs(corners - np.array(page)).max()
        total += out.stat().st_size
        print(f'{out.name:22} {w2}x{h2} {out.stat().st_size // 1024:4} KB  corner dev {dev}')
for name, box in PRINTS.items():
    im = Image.open(SRC / f'raw/p-{name}.jpg').convert('RGB').crop(box).resize((600, 750), Image.LANCZOS)
    out = OUT / f'print-{name}.webp'
    save(im, out, 80)
    total += out.stat().st_size
    print(f'{out.name:22} 600x750 {out.stat().st_size // 1024:4} KB')
print('total', total // 1024, 'KB')

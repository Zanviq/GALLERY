"""Grade the raw Gemini stills so the set reads as one roll of film (dev tool, not deployed).

    python -I grade.py <raw-dir> <out-dir> [name ...]

Writes <out-dir>/<name>.png for each still below; tools/img_prep.py then crops and exports webp.
Per image: white-balance gains (r, g, b), saturation, and a small black lift so the shadows match
the hero's soft film toe. The visit room was shot warm (beige wall, honey wood): it gets the
strongest cool shift so it sits with the plaster series.
"""
import os
import sys

from PIL import Image, ImageEnhance

RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)

SET = {
    # name: (source, (r, g, b) gains, saturation, black lift 0-255)
    'hero': ('01-hero.jpg', (1.0, 1.0, 1.0), 0.96, 4),
    'row': ('02-row.jpg', (1.0, 1.0, 1.0), 0.94, 4),
    'yuwol': ('03-yuwol.jpg', (0.99, 1.0, 1.01), 0.94, 4),
    'nuruk': ('05-nuruk.jpg', (1.0, 1.0, 1.0), 0.94, 4),
    'omi': ('06-omi.jpg', (0.99, 1.0, 1.01), 0.92, 4),
    'meok': ('07-meok.jpg', (1.0, 1.0, 1.0), 0.94, 4),
    'fill': ('12-fill.jpg', (0.99, 1.0, 1.01), 0.92, 4),
    'shelf': ('09-shelf.jpg', (0.99, 1.0, 1.02), 0.88, 4),
    'visit': ('10-visit.jpg', (0.92, 0.97, 1.06), 0.78, 6),
}

ONLY = set(sys.argv[3:])
for name, (src, gains, sat, lift) in SET.items():
    if ONLY and name not in ONLY:
        continue
    im = Image.open(os.path.join(RAW, src)).convert('RGB')
    bands = []
    for band, g in zip(im.split(), gains):
        bands.append(band.point(lambda v, g=g: min(255, round(lift + v * g * (255 - lift) / 255))))
    im = Image.merge('RGB', bands)
    im = ImageEnhance.Color(im).enhance(sat)
    out = os.path.join(OUT, name + '.png')
    im.save(out)
    print(out, im.size)

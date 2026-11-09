"""Favicons from the velvet photograph: closed emerald curtain with light through the seam.

    python -I design/works/curtain/scripts/icons.py <gen dir>
"""
import pathlib
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[4]
OUT = ROOT / 'works' / 'curtain' / 'img'
src = Image.open(pathlib.Path(sys.argv[1]) / 'velvet-a.jpg').convert('RGB')
W, H = src.size
seam = 1343                                     # measured by images.py
side = int(H * 0.62)
sq = src.crop((seam - side // 2, int(H * 0.2), seam + side // 2, int(H * 0.2) + side))
a = np.asarray(sq).astype(np.float32) / 255 * np.array([0.72, 1.0, 1.13], dtype=np.float32)


def make(size, name):
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)
    b = np.asarray(im).astype(np.float32) / 255
    x = np.linspace(-1, 1, size, dtype=np.float32)[None, :]
    y = np.linspace(0, 1, size, dtype=np.float32)[:, None]
    # the seam parts a little toward the floor; cool white light comes through it
    w = 0.035 + 0.11 * y ** 1.6
    slit = np.clip(1 - np.abs(x) / w, 0, 1) ** 0.6
    glow = np.exp(-(x / (w * 3.2)) ** 2) * 0.35 * y
    light = np.clip(slit + glow, 0, 1)[..., None]
    b = b * (1 - light) + np.array([0.93, 0.96, 0.95], dtype=np.float32) * light
    out = Image.fromarray((np.clip(b, 0, 1) * 255 + 0.5).astype(np.uint8))
    if size <= 32:
        out = out.filter(ImageFilter.UnsharpMask(1, 60, 2))
    out.save(OUT / name, optimize=True)
    print(name, (OUT / name).stat().st_size, 'bytes')


make(32, 'favicon-32.png')
make(180, 'apple-touch-icon.png')

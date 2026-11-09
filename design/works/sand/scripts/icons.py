"""Favicon and touch icon from the pink sand jar photograph, on the page's black.

    python -I icons.py <works/sand/img>
"""
import pathlib
import sys

from PIL import Image

IMG = pathlib.Path(sys.argv[1])
jar = Image.open(IMG / 'jar-1.webp').convert('RGBA')
for size, name, pad in ((32, 'favicon-32.png', 1), (180, 'apple-touch-icon.png', 18)):
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 255))
    h = size - 2 * pad
    w = round(h * jar.width / jar.height)
    j = jar.resize((w, h), Image.LANCZOS)
    bg.alpha_composite(j, ((size - w) // 2, pad))
    bg.convert('RGB').save(IMG / name, optimize=True)
    print(name, (IMG / name).stat().st_size, 'bytes')

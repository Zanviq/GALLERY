"""Raster favicons from the same drawing as img/favicon.svg (build tool, not deployed)."""
import pathlib
from PIL import Image, ImageDraw
OUT = pathlib.Path(__file__).resolve().parents[4] / 'works' / 'marathon' / 'img'
for size, name in ((32, 'favicon-32.png'), (180, 'apple-touch-icon.png')):
    k = size / 32
    im = Image.new('RGB', (size, size), '#0047FF')
    d = ImageDraw.Draw(im)
    for x in (6, 14, 22):
        d.rectangle([x * k, 6 * k, (x + 5) * k - 1, 26 * k - 1], fill='#FFFFFF')
    d.rectangle([0, 19 * k, size, 23 * k - 1], fill='#E5202A')
    im.save(OUT / name)

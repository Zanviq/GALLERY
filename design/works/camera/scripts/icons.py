"""Favicon PNGs (32 px, 180 px apple-touch) from the Do Hyeon glyph for 방 (dev tool).

    python -I icons.py <DoHyeon-Regular.ttf> <works/camera/img>
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ttf, out = sys.argv[1], Path(sys.argv[2])
for size, name, radius in ((32, 'favicon-32.png', 5), (180, 'apple-touch-icon.png', 0)):
    s = size * 4
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, s - 1, s - 1), radius=radius * 4, fill=(255, 225, 77, 255))
    font = ImageFont.truetype(ttf, int(s * 0.86))
    x0, y0, x1, y1 = d.textbbox((0, 0), '방', font=font)
    d.text(((s - (x1 - x0)) / 2 - x0, (s - (y1 - y0)) / 2 - y0), '방', font=font, fill=(0, 0, 0, 255))
    im.resize((size, size), Image.LANCZOS).save(out / name)
    print(name)

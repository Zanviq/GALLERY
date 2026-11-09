"""Turn the review captures into the gallery's thumbnail and OG image.

    python -I design/works/riso/scripts/finish_images.py <thumb capture.png> <og capture.png>

thumbnail: 1200x900 webp q82 (a real capture of the page, sheet and drum panel in view)
og:        1200x630 png (design/works/riso/og.html, same ink engine as the page)
"""
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[4]
thumb_src, og_src = sys.argv[1], sys.argv[2]

t = Image.open(thumb_src).convert('RGB')
assert t.size == (1200, 900), t.size
t.save(ROOT / 'thumbnails' / 'riso.webp', 'WEBP', quality=82, method=6)

o = Image.open(og_src).convert('RGB')
assert o.size == (1200, 630), o.size
o.save(ROOT / 'og' / 'riso.png', 'PNG', optimize=True)

for p in [ROOT / 'thumbnails' / 'riso.webp', ROOT / 'og' / 'riso.png']:
    print(p.relative_to(ROOT), round(p.stat().st_size / 1024, 1), 'KB')

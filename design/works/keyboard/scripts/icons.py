"""Write works/keyboard/img/favicon-32.png and apple-touch-icon.png (same drawing as favicon.svg)."""
import os
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..', 'works', 'keyboard', 'img'))
CASE, FIELD, INK = '#D12F6B', '#F6A3C2', '#2E0A1A'
def draw(size, radius):
    s = 8
    im = Image.new('RGBA', (size * s, size * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    k = size * s / 32
    d.rounded_rectangle((0, 0, size * s - 1, size * s - 1), radius=radius * k, fill=CASE)
    for x, y, c in ((4, 10, FIELD), (12.5, 13.4, INK), (21, 10, FIELD)):
        d.rounded_rectangle((x * k, y * k, (x + 7) * k, (y + 7) * k), radius=1.7 * k, fill=c)
    return im.resize((size, size), Image.LANCZOS)
draw(32, 7).save(os.path.join(IMG, 'favicon-32.png'))
draw(180, 0).convert('RGB').save(os.path.join(IMG, 'apple-touch-icon.png'))
print('ok')

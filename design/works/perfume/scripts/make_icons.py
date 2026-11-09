"""Favicons for 담금: the syllable 담 in Hahmlet Light, ink on the plum field.

    <scratchpad>/fontenv/Scripts/python.exe -I make_icons.py <Hahmlet.ttf> <repo-root>

Writes works/perfume/img/favicon.svg (glyph outline as a path, no font needed),
favicon-32.png and apple-touch-icon.png (180). PIL is imported from the system Python's
site-packages if the font env lacks it (pass its path as a third argument).
"""
import io
import os
import sys
import tempfile

SRC, ROOT = sys.argv[1], sys.argv[2]
if len(sys.argv) > 3:
    sys.path.append(sys.argv[3])

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image, ImageDraw, ImageFont

PLUM, INK = '#a9c25a', '#15191b'
OUT = os.path.join(ROOT, 'works', 'perfume', 'img')

font = instancer.instantiateVariableFont(TTFont(SRC), {'wght': 360})
buf = io.BytesIO()
font.save(buf)
gs = font.getGlyphSet()
gname = font.getBestCmap()[ord('담')]
bp = BoundsPen(gs)
gs[gname].draw(bp)
x0, y0, x1, y1 = bp.bounds
w, h = x1 - x0, y1 - y0
box = 64
scale = (box * 0.68) / max(w, h)
tx = (box - w * scale) / 2 - x0 * scale
ty = (box + h * scale) / 2 + y0 * scale
pen = SVGPathPen(gs)
gs[gname].draw(TransformPen(pen, (scale, 0, 0, -scale, tx, ty)))
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {box} {box}">'
       f'<rect width="{box}" height="{box}" rx="10" fill="{PLUM}"/>'
       f'<path fill="{INK}" d="{pen.getCommands()}"/></svg>\n')
with open(os.path.join(OUT, 'favicon.svg'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(svg)

with tempfile.NamedTemporaryFile(suffix='.ttf', delete=False) as tmp:
    tmp.write(buf.getvalue())
for size, name, radius in [(32, 'favicon-32.png', 5), (180, 'apple-touch-icon.png', 0)]:
    big = size * 4
    im = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, big - 1, big - 1), radius=radius * 4, fill=PLUM)
    pil_font = ImageFont.truetype(tmp.name, int(big * 0.68 * font['head'].unitsPerEm / max(w, h)))
    bb = d.textbbox((0, 0), '담', font=pil_font)
    d.text(((big - (bb[2] - bb[0])) / 2 - bb[0], (big - (bb[3] - bb[1])) / 2 - bb[1]), '담', font=pil_font, fill=INK)
    im.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name))
os.unlink(tmp.name)
print('icons written to', OUT)

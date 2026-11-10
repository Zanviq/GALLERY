"""Favicons from the 사 glyph of RIDIBatang, white on the cherry field (system python with PIL + fontTools, -I).

    python -I icons.py <path to RIDIBatang.otf>
"""
import os
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..', 'works', 'coffee', 'img'))
src = sys.argv[1]
CHERRY = '#5E1224'
CH = '사'

font = TTFont(src)
gs = font.getGlyphSet()
gname = font.getBestCmap()[ord(CH)]
bp = BoundsPen(gs)
gs[gname].draw(bp)
x0, y0, x1, y1 = bp.bounds
pen = SVGPathPen(gs)
gs[gname].draw(pen)
w, h = x1 - x0, y1 - y0
size = 100
scale = 70 / max(w, h)
tx = (size - w * scale) / 2 - x0 * scale
ty = (size + h * scale) / 2 + y0 * scale
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
       f'<rect width="{size}" height="{size}" fill="{CHERRY}"/>'
       f'<path fill="#fff" transform="translate({tx:.2f} {ty:.2f}) scale({scale:.5f} {-scale:.5f})" d="{pen.getCommands()}"/></svg>')
open(os.path.join(OUT, 'favicon.svg'), 'w', encoding='utf-8').write(svg)


def png(px, name):
    im = Image.new('RGB', (px, px), CHERRY)
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(src, int(px * 0.78))
    l, t, r, b = d.textbbox((0, 0), CH, font=f)
    d.text(((px - (r - l)) / 2 - l, (px - (b - t)) / 2 - t), CH, font=f, fill='#FFFFFF')
    im.save(os.path.join(OUT, name))


png(32, 'favicon-32.png')
png(180, 'apple-touch-icon.png')
print('icons written', os.path.getsize(os.path.join(OUT, 'favicon.svg')), 'bytes svg')

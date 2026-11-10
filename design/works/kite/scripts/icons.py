"""Favicons from the Jua glyph 훨 on the sky colour (dev tool, not deployed).

    python -I design/works/kite/scripts/icons.py <Jua-Regular.ttf>   (needs fontTools and Pillow)
"""
import os
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
IMG = os.path.join(ROOT, 'works', 'kite', 'img')
SKY, INK, RED = '#59B7F0', '#0B0C0D', '#D7142C'

ttf = sys.argv[1]
font = TTFont(ttf)
gs = font.getGlyphSet()
gname = font.getBestCmap()[ord('훨')]
bp = BoundsPen(gs)
gs[gname].draw(bp)
x0, y0, x1, y1 = bp.bounds
pen = SVGPathPen(gs)
gs[gname].draw(pen)
w, h = x1 - x0, y1 - y0
size = max(w, h) * 1.22
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
# flip y (font units go up), centre in a square viewBox
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size:.0f} {size:.0f}">'
       f'<rect width="{size:.0f}" height="{size:.0f}" rx="{size * 0.12:.0f}" fill="{SKY}"/>'
       f'<path fill="{INK}" transform="translate({size / 2 - cx:.1f} {size / 2 + cy:.1f}) scale(1 -1)" d="{pen.getCommands()}"/>'
       f'</svg>')
open(os.path.join(IMG, 'favicon.svg'), 'w', encoding='utf-8').write(svg)


def png(px, path, pad=0.12, radius=0.0):
    im = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, px - 1, px - 1], radius=int(px * radius), fill=SKY)
    f = ImageFont.truetype(ttf, int(px * (1 - 2 * pad)))
    bb = d.textbbox((0, 0), '훨', font=f)
    d.text(((px - (bb[2] - bb[0])) / 2 - bb[0], (px - (bb[3] - bb[1])) / 2 - bb[1]), '훨', font=f, fill=INK)
    im.save(path)


png(32, os.path.join(IMG, 'favicon-32.png'), pad=0.08, radius=0.12)
png(180, os.path.join(IMG, 'apple-touch-icon.png'), pad=0.16)
print('favicon.svg', os.path.getsize(os.path.join(IMG, 'favicon.svg')), 'bytes')

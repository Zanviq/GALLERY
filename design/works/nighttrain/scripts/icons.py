"""Favicon set for 밤차: the syllable 밤 in 이롭게 바탕체 Medium (the page serif), white on the night blue.

    <scratchpad>/fontenv/Scripts/python.exe -I design/works/nighttrain/scripts/icons.py <font source dir>

favicon.svg carries the glyph as an outline path (no font needed). favicon-32.png and
apple-touch-icon.png are captured from that SVG with headless Chrome (scripts/capture.sh).
"""
import pathlib
import re
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[4]
OUT = ROOT / 'works' / 'nighttrain' / 'img'
SRC = pathlib.Path(sys.argv[1]) / 'IropkeBatangM.otf'  # the same source dir as fonts.py

font = TTFont(SRC)
gs = font.getGlyphSet()
name = font.getBestCmap()[ord('밤')]
bp = BoundsPen(gs)
gs[name].draw(bp)
x0, y0, x1, y1 = bp.bounds
size = 64
box = 46  # glyph fits in a 46-unit square, centred
scale = box / max(x1 - x0, y1 - y0)
tx = (size - (x1 - x0) * scale) / 2 - x0 * scale
ty = (size + (y1 - y0) * scale) / 2 + y0 * scale
pen = SVGPathPen(gs)
gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, tx, ty)))
d = re.sub(r'-?\d+\.\d+', lambda m: f'{float(m.group()):.1f}'.rstrip('0').rstrip('.'), pen.getCommands())
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
       f'<rect width="{size}" height="{size}" fill="#1B2F6E"/>'
       f'<path fill="#FFFFFF" d="{d}"/></svg>\n')
(OUT / 'favicon.svg').write_text(svg, encoding='utf-8')
print('favicon.svg', len(svg), 'bytes')

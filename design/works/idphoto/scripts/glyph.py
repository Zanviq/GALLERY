"""Print one Song Myung glyph as an SVG path, for the favicon and the header mark (dev tool).

    <fontenv>/python.exe -I design/works/idphoto/scripts/glyph.py 정 [size]

Reads the subset font in works/idphoto/fonts/, scales the glyph into a size x size box (y down) and
prints the path data plus its bounding box, so the mark is type turned into outlines, not a drawing.
"""
import pathlib
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[4]
ch = sys.argv[1]
size = float(sys.argv[2]) if len(sys.argv) > 2 else 20.0
font = TTFont(ROOT / 'works' / 'idphoto' / 'fonts' / 'song-myung-400.woff2')
gs = font.getGlyphSet()
name = font.getBestCmap()[ord(ch)]
bp = BoundsPen(gs)
gs[name].draw(bp)
x0, y0, x1, y1 = bp.bounds
s = size / max(x1 - x0, y1 - y0)
# fit the glyph's ink box into size x size, centred, flipping y
dx = (size - (x1 - x0) * s) / 2 - x0 * s
dy = (size - (y1 - y0) * s) / 2 + y1 * s
pen = SVGPathPen(gs, ntos=lambda v: f'{v:.2f}'.rstrip('0').rstrip('.'))
gs[name].draw(TransformPen(pen, (s, 0, 0, -s, dx, dy)))
print(pen.getCommands())
print('ink box', round((x1 - x0) * s, 2), round((y1 - y0) * s, 2))

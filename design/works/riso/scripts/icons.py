"""Favicon for the riso work: the 겹 glyph pulled twice, pink then blue, a hair out of register.

    <scratchpad>/fontenv/Scripts/python.exe -I design/works/riso/scripts/icons.py

Reads the glyph outline from works/riso/fonts/black-han-sans.woff2 (run fonts.py first), writes
works/riso/img/favicon.svg and design/works/riso/scripts/icon-sheet.html, which shots.mjs captures
into favicon-32.png and apple-touch-icon.png. The overlap colour comes from the same ink model as
the page (multiply, then the later drum covers a little: pink .30, blue .26).
"""
import pathlib

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'riso'
HERE = pathlib.Path(__file__).resolve().parent

PINK = (255, 72, 176)
BLUE = (0, 120, 191)


def lay(paper, ink, hide):
    out = []
    for c, i in zip(paper, ink):
        c, i = c / 255, i / 255
        c = c * i
        c = c + (i - c) * hide
        out.append(round(c * 255))
    return tuple(out)


def hexc(c):
    return '#%02x%02x%02x' % c


def main():
    font = TTFont(str(SITE / 'fonts' / 'black-han-sans.woff2'))
    gs = font.getGlyphSet()
    name = font.getBestCmap()[ord('겹')]
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    x0, y0, x1, y1 = bp.bounds
    pen = SVGPathPen(gs)
    gs[name].draw(pen)
    d = pen.getCommands()

    box = 50.0
    k = box / max(x1 - x0, y1 - y0)
    w, h = (x1 - x0) * k, (y1 - y0) * k
    tx = (64 - w) / 2 - x0 * k
    ty = (64 - h) / 2 + y1 * k   # y is flipped
    off = 1.7
    base = f'matrix({k:.5f} 0 0 {-k:.5f} {{x:.3f}} {{y:.3f}})'
    t_pink = base.format(x=tx - off, y=ty - off * 0.7)
    t_blue = base.format(x=tx + off, y=ty + off * 0.7)

    pink_on_paper = lay((255, 255, 255), PINK, 0.30)
    blue_on_paper = lay((255, 255, 255), BLUE, 0.26)
    both = lay(pink_on_paper, BLUE, 0.26)   # pink first, blue second

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><clipPath id="p"><path transform="{t_pink}" d="{d}"/></clipPath></defs>
<rect width="64" height="64" fill="#fff"/>
<path transform="{t_pink}" fill="{hexc(pink_on_paper)}" d="{d}"/>
<path transform="{t_blue}" fill="{hexc(blue_on_paper)}" d="{d}"/>
<g clip-path="url(#p)"><path transform="{t_blue}" fill="{hexc(both)}" d="{d}"/></g>
</svg>
'''
    (SITE / 'img').mkdir(exist_ok=True)
    (SITE / 'img' / 'favicon.svg').write_text(svg, encoding='utf-8')
    sheet = f'''<!doctype html><meta charset="utf-8"><style>body{{margin:0;background:#fff}}
img{{display:block}}#a{{width:180px;height:180px}}#b{{width:32px;height:32px}}</style>
<img id="a" src="../../../../works/riso/img/favicon.svg" alt=""><img id="b" src="../../../../works/riso/img/favicon.svg" alt="">'''
    (HERE / 'icon-sheet.html').write_text(sheet, encoding='utf-8')
    print('favicon.svg', len(svg), 'bytes; overlap', hexc(both))


if __name__ == '__main__':
    main()

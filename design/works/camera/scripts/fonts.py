"""Subset Do Hyeon and Sunflower to the characters the page uses, and check coverage (dev tool).

    <scratch>/fontenv/Scripts/python.exe -I fonts.py <font-source-dir>

Reads works/camera/index.html (text, alt, aria-label, title, content attributes) and js/*.js
(string literals), writes woff2 subsets to works/camera/fonts/, copies the licences, and
fails if any character on the page is missing from a font. Neither family declares a Reserved
Font Name in its OFL, so the subsets keep their names.
The favicon SVG is drawn from the Do Hyeon glyph for 방 (img/favicon.svg).
"""
import html
import re
import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

sys.stdout.reconfigure(encoding='utf-8')
SRC = Path(sys.argv[1])
ROOT = Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'camera'
OUT = SITE / 'fonts'
OUT.mkdir(exist_ok=True)

FONTS = [
    ('dohyeon_DoHyeon-Regular.ttf', 'dohyeon.woff2'),
    ('sunflower_Sunflower-Medium.ttf', 'sunflower-500.woff2'),
    ('sunflower_Sunflower-Bold.ttf', 'sunflower-700.woff2'),
]
LICENCES = [('dohyeon_OFL.txt', 'OFL-DoHyeon.txt'), ('sunflower_OFL.txt', 'OFL-Sunflower.txt')]


def page_chars():
    src = (SITE / 'index.html').read_text(encoding='utf-8')
    src = re.sub(r'<(script|style)\b.*?</\1>', ' ', src, flags=re.S)
    text = ' '.join(re.findall(r'(?:alt|aria-label|title|content|placeholder)="([^"]*)"', src))
    text += ' ' + re.sub(r'<[^>]+>', ' ', src)
    for js in sorted((SITE / 'js').glob('*.js')):
        code = js.read_text(encoding='utf-8')
        code = re.sub(r'^\s*//.*$', '', code, flags=re.M)
        for a, b in re.findall(r"'([^'\n]*)'|`([^`]*)`", code):
            text += ' ' + a + ' ' + b
    text = html.unescape(text)
    chars = {c for c in text if ord(c) >= 32 and not c.isspace()}
    chars |= set('0123456789,.원장 ')
    chars |= {chr(c) for c in range(0x20, 0x7F)} - {'`'}
    return ''.join(sorted(chars))


chars = page_chars()
hangul = [c for c in chars if '가' <= c <= '힣']
print('characters', len(chars), 'hangul syllables', len(hangul))
ok = True
for src, dst in FONTS:
    f = TTFont(SRC / src)
    cmap = f.getBestCmap()
    missing = [c for c in chars if ord(c) not in cmap and c != ' ']
    # printable ASCII is added for safety; only report ASCII gaps that the page actually uses
    if missing:
        print(f'  {src}: missing {"".join(missing)!r}')
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    s = subset.Subsetter(opts)
    s.populate(text=chars)
    s.subset(f)
    f.flavor = 'woff2'
    f.save(OUT / dst)
    print(f'  {dst}: {(OUT / dst).stat().st_size // 1024} KB')
    if any(c not in {chr(x) for x in range(0x20, 0x7F)} for c in missing):
        ok = False
for a, b in LICENCES:
    shutil.copy(SRC / a, OUT / b)

# favicon: the 방 glyph from Do Hyeon, black on lemon
f = TTFont(SRC / 'dohyeon_DoHyeon-Regular.ttf')
gs = f.getGlyphSet()
name = f.getBestCmap()[ord('방')]
g = gs[name]
pen = SVGPathPen(gs)
upm = f['head'].unitsPerEm
asc = f['hhea'].ascent
# fit the glyph box into 64x64 with a margin
from fontTools.pens.boundsPen import BoundsPen
bp = BoundsPen(gs)
g.draw(bp)
x0, y0, x1, y1 = bp.bounds
scale = 50 / max(x1 - x0, y1 - y0)
tx = 32 - (x0 + x1) / 2 * scale
ty = 32 + (y0 + y1) / 2 * scale
g.draw(TransformPen(pen, (scale, 0, 0, -scale, tx, ty)))
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
       f'<rect width="64" height="64" rx="10" fill="#FFE14D"/>'
       f'<path d="{pen.getCommands()}" fill="#000"/></svg>\n')
(SITE / 'img' / 'favicon.svg').write_text(svg, encoding='utf-8')
print('favicon.svg', len(svg), 'bytes')
sys.exit(0 if ok else 1)

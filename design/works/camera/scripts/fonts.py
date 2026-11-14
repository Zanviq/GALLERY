"""Subset 카페24 써라운드 + 써라운드 에어 to the characters the page uses, and check coverage (dev tool).

    <scratch>/fontenv/Scripts/python.exe -I fonts.py <dir with Cafe24Ssurround-v2.0.ttf and Cafe24SsurroundAir-v1.1.ttf>

Source: the official zips from https://fonts.cafe24.com (img.cafe24.com/csdstatic/freefonts/download/kr/
Cafe24Ssurround-v2.0.zip, Cafe24SsurroundAir-v1.1.zip). Each zip's License-*.pdf: SIL Open Font License 1.1,
"자유롭게 수정하고 재배포할 수 있습니다", no Reserved Font Name. The name tables say "Cafe24 Ssurround is a
trademark of Cafe24", and these files are modified (subset, plus one added glyph), so they are renamed:
    Cafe24 Ssurround     -> "Bangeum Round" Bold   (display, figures, labels, buttons)
    Cafe24 Ssurround Air -> "Bangeum Round Air" Light (reading text)
Neither font has U+00D7 (×), which the page uses in sizes ("76 × 102 mm"); it is added to both subsets as
the font's own plus sign turned 45° and set at 115 %, so the sizes do not fall back to a system font.

Reads works/camera/index.html (text, alt, aria-label, title, content attributes) and js/*.js (string
literals), writes woff2 subsets to works/camera/fonts/ and fails if any character on the page is missing.
U+2060 is exempt (default-ignorable). Also redraws img/favicon.svg from the Bold 방.
"""
import html
import math
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

sys.stdout.reconfigure(encoding='utf-8')
SRC = Path(sys.argv[1])
ROOT = Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'camera'
OUT = SITE / 'fonts'
OUT.mkdir(exist_ok=True)

FONTS = [
    # source, output, new family, style
    ('Cafe24Ssurround-v2.0.ttf', 'bangeum-round-700.woff2', 'Bangeum Round', 'Bold'),
    ('Cafe24SsurroundAir-v1.1.ttf', 'bangeum-round-air-300.woff2', 'Bangeum Round Air', 'Light'),
]
EXEMPT = {'⁠'}


def page_chars():
    src = (SITE / 'index.html').read_text(encoding='utf-8')
    src = re.sub(r'<(script|style)\b.*?</\1>', ' ', src, flags=re.S)
    src = re.sub(r'<desc\b.*?</desc>', ' ', src, flags=re.S)  # SVG desc is never drawn
    text = ' '.join(re.findall(r'(?:alt|aria-label|title|content|placeholder)="([^"]*)"', src))
    text += ' ' + re.sub(r'<[^>]+>', ' ', src)
    for js in sorted((SITE / 'js').glob('*.js')):
        code = js.read_text(encoding='utf-8')
        code = re.sub(r'^\s*//.*$', '', code, flags=re.M)
        for a, b in re.findall(r"'([^'\n]*)'|`([^`]*)`", code):
            text += ' ' + a + ' ' + b
    text = html.unescape(text)
    text = text.replace('\\u00a0', ' ').replace('\\u2060', '⁠')
    chars = {c for c in text if ord(c) >= 32 and (not c.isspace() or c == ' ')}
    chars |= set('0123456789,.원장 ')
    chars |= {chr(c) for c in range(0x20, 0x7F)} - {'`'}
    return ''.join(sorted(chars))


def add_times(font):
    """Add × (U+00D7): the font's + turned 45 degrees around its centre, at 115 %."""
    cmap = font.getBestCmap()
    if 0xD7 in cmap:
        return
    gs = font.getGlyphSet()
    plus = cmap[ord('+')]
    bp = BoundsPen(gs)
    gs[plus].draw(bp)
    x0, y0, x1, y1 = bp.bounds
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    k, a = 1.15, math.radians(45)  # turned, the arms lose cos 45°: 1.15 keeps the × close to the + in size
    c, s = k * math.cos(a), k * math.sin(a)
    t = (c, s, -s, c, cx - (c * cx - s * cy), cy - (s * cx + c * cy))
    pen = TTGlyphPen(gs)
    gs[plus].draw(TransformPen(pen, t))
    g = pen.glyph()
    name = 'multiply'
    order = font.getGlyphOrder() + [name]
    font.setGlyphOrder(order)
    glyf = font['glyf']
    glyf.glyphOrder = order
    glyf.glyphs[name] = g
    g.recalcBounds(glyf)
    font['hmtx'].metrics[name] = (font['hmtx'][plus][0], g.xMin)
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap[0xD7] = name


def rename(font, family, style):
    ps = (family + '-' + style).replace(' ', '')
    keep = []
    for r in font['name'].names:
        nid = r.nameID
        if nid in (1, 16, 21):
            r.string = family
        elif nid in (2, 17):
            r.string = style
        elif nid in (4, 18):
            r.string = f'{family} {style}'
        elif nid == 6:
            r.string = ps
        elif nid == 3:
            r.string = f'{ps};subset of Cafe24 fonts'
        if r.platformID == 3 and r.langID != 0x409 and nid in (1, 3, 4, 6, 16, 17, 18, 21):
            continue  # drop the Korean-language family names (they still say 카페24 …)
        if r.platformID == 1 and nid in (1, 3, 4, 6, 16, 17, 18, 21):
            continue
        keep.append(r)
    font['name'].names = keep


chars = page_chars()
hangul = [c for c in chars if '가' <= c <= '힣']
print('characters', len(chars), 'hangul syllables', len(hangul))
ok = True
for src, dst, family, style in FONTS:
    f = TTFont(SRC / src)
    add_times(f)
    cmap = f.getBestCmap()
    missing = [c for c in chars if ord(c) not in cmap and c != ' ' and c not in EXEMPT]
    if missing:
        print(f'  {src}: missing {"".join(missing)!r}')
        ok = False
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.notdef_outline = True
    opts.drop_tables += ['DSIG']
    s = subset.Subsetter(opts)
    s.populate(text=chars)
    s.subset(f)
    rename(f, family, style)
    f.flavor = 'woff2'
    f.save(OUT / dst)
    left = [r.toUnicode() for r in f['name'].names if 'ssurround' in r.toUnicode().lower() and r.nameID != 7]
    print(f'  {dst}: {(OUT / dst).stat().st_size // 1024} KB, {len(f.getGlyphOrder())} glyphs, × {0xD7 in f.getBestCmap()}, old name left: {left}')

# favicon: the 방 glyph from the Bold, black on lemon
f = TTFont(SRC / 'Cafe24Ssurround-v2.0.ttf')
gs = f.getGlyphSet()
g = gs[f.getBestCmap()[ord('방')]]
bp = BoundsPen(gs)
g.draw(bp)
x0, y0, x1, y1 = bp.bounds
scale = 50 / max(x1 - x0, y1 - y0)
tx = 32 - (x0 + x1) / 2 * scale
ty = 32 + (y0 + y1) / 2 * scale
pen = SVGPathPen(gs)
g.draw(TransformPen(pen, (scale, 0, 0, -scale, tx, ty)))
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
       f'<rect width="64" height="64" rx="10" fill="#FFE14D"/>'
       f'<path d="{pen.getCommands()}" fill="#000"/></svg>\n')
(SITE / 'img' / 'favicon.svg').write_text(svg, encoding='utf-8')
print('favicon.svg', len(svg), 'bytes')
sys.exit(0 if ok else 1)

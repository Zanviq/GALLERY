"""Cut the idphoto text face from NanumSquare Neo, renamed Jeongmyeon Sans, and check every character.

    <fontenv>/python.exe -I design/works/idphoto/scripts/fonts.py <NanumSquareNeo-Variable.ttf>

Source: NanumSquareNeo-Variable.ttf from NAVER's 나눔스퀘어 네오 package (hangeul.naver.com),
SIL OFL 1.1. NAVER reserves the Nanum names (see works/idphoto/fonts/OFL-JeongmyeonSans.txt), so the
files are a modified version renamed "Jeongmyeon Sans" in the name table and in every CSS reference.

Per CSS weight (400, 500, 700 = the variable font's wght 300 Regular, 400, 500 Bold):
  1. subset the variable font to the characters of index.html and js/*.js (plus printable ASCII),
  2. pin the weight axis,
  3. map U+00A0 to the space glyph and U+2060 (word joiner) to an empty zero-width glyph; the font
     has neither, and the page uses both between numbers and units and around middots,
  4. add tabular figures: zero.tnum ... nine.tnum (composites of the font's own digits, centred on
     the widest digit's advance) and a GSUB 'tnum' feature. The font's digits are proportional and
     it ships no tnum, so `font-variant-numeric: tabular-nums` would otherwise do nothing,
  5. rename, write woff2 to works/idphoto/fonts/jeongmyeon-sans-<weight>.woff2.
Then writes css/fonts.css (Song Myung, the display face, is kept as it was) and checks that every
character is in all three files. Song Myung's misses are listed: they fall back to Jeongmyeon Sans.
Re-run whenever the copy changes.
"""
import html
import io
import pathlib
import sys

from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import otTables as ot
from fontTools.ttLib.tables._g_l_y_f import Glyph
from fontTools.varLib import instancer

sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'idphoto'
OUT = SITE / 'fonts'
FAMILY = 'Jeongmyeon Sans'
STEM = 'jeongmyeon-sans'
WEIGHTS = [(400, 300, 'Regular'), (500, 400, 'Medium'), (700, 500, 'Bold')]   # css, wght, style
DIGITS = '0123456789'


def used_chars():
    text = html.unescape((SITE / 'index.html').read_text(encoding='utf-8'))
    for js in sorted((SITE / 'js').rglob('*.js')):
        text += js.read_text(encoding='utf-8')
    chars = set(ch for ch in text if ord(ch) >= 32)
    chars |= set(chr(c) for c in range(32, 127)) | {' ', '⁠'}
    chars -= {'﻿', '⁠', ' '}       # added by hand below, not by the subsetter
    return ''.join(sorted(chars))


def add_glyph(font, name, glyph, advance, lsb):
    font['glyf'][name] = glyph
    font['hmtx'].metrics[name] = (advance, lsb)
    if 'vmtx' in font:
        font['vmtx'].metrics[name] = font['vmtx'].metrics[font.getGlyphOrder()[1]]
    order = font.getGlyphOrder()
    if name not in order:
        font.setGlyphOrder(order + [name])


def add_spaces(font):
    cmap = font.getBestCmap()
    space = cmap[0x20]
    empty = Glyph()
    empty.numberOfContours = 0
    add_glyph(font, 'uni2060', empty, 0, 0)
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap[0x00A0] = space
            table.cmap[0x2060] = 'uni2060'


def add_tnum(font):
    cmap = font.getBestCmap()
    glyf, hmtx = font['glyf'], font['hmtx']
    names = [cmap[ord(d)] for d in DIGITS]
    width = max(hmtx[n][0] for n in names)
    mapping = {}
    for n in names:
        adv, lsb = hmtx[n]
        dx = round((width - adv) / 2)
        pen = TTGlyphPen(font.getGlyphSet())
        pen.addComponent(n, (1, 0, 0, 1, dx, 0))
        g = pen.glyph()
        g.recalcBounds(glyf)
        add_glyph(font, n + '.tnum', g, width, lsb + dx)
        mapping[n] = n + '.tnum'
    gsub = font['GSUB'].table
    lookup = ot.Lookup()
    lookup.LookupType, lookup.LookupFlag = 1, 0
    st = ot.SingleSubst()
    st.mapping = mapping
    lookup.SubTable, lookup.SubTableCount = [st], 1
    gsub.LookupList.Lookup.append(lookup)
    gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)
    rec = ot.FeatureRecord()
    rec.FeatureTag = 'tnum'
    rec.Feature = ot.Feature()
    rec.Feature.FeatureParams = None
    rec.Feature.LookupListIndex = [len(gsub.LookupList.Lookup) - 1]
    rec.Feature.LookupCount = 1
    # keep the FeatureList sorted by tag and renumber every LangSys that points into it
    old = gsub.FeatureList.FeatureRecord
    records = sorted(old + [rec], key=lambda r: r.FeatureTag)
    remap = {i: records.index(r) for i, r in enumerate(old)}
    gsub.FeatureList.FeatureRecord = records
    gsub.FeatureList.FeatureCount = len(records)
    for sr in gsub.ScriptList.ScriptRecord:
        for ls in [sr.Script.DefaultLangSys] + [r.LangSys for r in sr.Script.LangSysRecord]:
            if ls is None:
                continue
            ls.FeatureIndex = sorted([remap[i] for i in ls.FeatureIndex] + [records.index(rec)])
            ls.FeatureCount = len(ls.FeatureIndex)
    return width


def rename(font, style, weight):
    name = font['name']
    ps = (FAMILY + '-' + style).replace(' ', '')
    keep = []
    for r in name.names:
        if r.nameID in (0, 7, 8, 9, 11, 12):
            keep.append(r)
    name.names = keep
    full = FAMILY if style == 'Regular' else f'{FAMILY} {style}'
    legacy_style = 'Regular' if style in ('Regular', 'Medium') else style
    legacy_family = FAMILY if style != 'Medium' else f'{FAMILY} Medium'
    for nid, s in [(1, legacy_family), (2, legacy_style), (3, f'{ps};subset'), (4, full), (5, 'Version 1.000'),
                   (6, ps), (16, FAMILY), (17, style),
                   (10, 'Modified version of NanumSquare Neo (NAVER Corp., designed by Sandoll Inc.): '
                        'subset, weight instanced, word joiner, no-break space and tabular figures added, renamed.'),
                   (13, 'This Font Software is licensed under the SIL Open Font License, Version 1.1.'),
                   (14, 'https://openfontlicense.org')]:
        name.setName(s, nid, 3, 1, 0x409)
    font['OS/2'].usWeightClass = weight
    for tag in ('STAT', 'DSIG'):
        if tag in font:
            del font[tag]


def build(src, chars):
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    opts.glyph_names = True
    base = TTFont(src)
    if 'STAT' in base:
        del base['STAT']      # the source's STAT points at axes it does not have; instancing chokes on it
    sub = subset.Subsetter(opts)
    sub.populate(text=chars)
    sub.subset(base)
    buf = io.BytesIO()
    base.save(buf)
    out = []
    for css, wght, style in WEIGHTS:
        font = TTFont(io.BytesIO(buf.getvalue()))
        font = instancer.instantiateVariableFont(font, {'wght': wght})
        add_spaces(font)
        width = add_tnum(font)
        rename(font, style, css)
        font.flavor = 'woff2'
        path = OUT / f'{STEM}-{css}.woff2'
        font.save(path)
        out.append((path, css, width))
    return out


def main():
    src = pathlib.Path(sys.argv[1])
    chars = used_chars()
    print(len(chars), 'unique characters')
    files = build(src, chars)
    rules = ["@font-face {\n  font-family: 'Song Myung';\n  src: url('../fonts/song-myung-400.woff2') format('woff2');\n"
             "  font-weight: 400;\n  font-style: normal;\n  font-display: swap;\n}\n"]
    bad = False
    for path, css, width in files:
        f = TTFont(path)
        cmap = f.getBestCmap()
        missing = [c for c in chars + ' ⁠' if ord(c) not in cmap]
        empty = [c for c in chars if ord(c) in cmap and not c.isspace() and cmap[ord(c)] in f['glyf'].glyphs
                 and f['glyf'][cmap[ord(c)]].numberOfContours == 0]
        feats = sorted({r.FeatureTag for r in f['GSUB'].table.FeatureList.FeatureRecord})
        names = f['name']
        print(f'{path.name}  {path.stat().st_size / 1024:.1f} KB  glyphs {len(f.getGlyphOrder())}  '
              f'family {names.getDebugName(16)!r}/{names.getDebugName(17)!r}  wght {f["OS/2"].usWeightClass}  '
              f'tnum width {width}  features {",".join(feats)}  missing {"".join(missing) or "-"}  '
              f'empty {"".join(empty) or "-"}')
        bad |= bool(missing or empty)
        rules.append(
            '@font-face {\n'
            f"  font-family: '{FAMILY}';\n"
            f"  src: url('../fonts/{path.name}') format('woff2');\n"
            f'  font-weight: {css};\n'
            '  font-style: normal;\n'
            '  font-display: swap;\n'
            '}\n')
    song = TTFont(OUT / 'song-myung-400.woff2').getBestCmap()
    print('Song Myung lacks (falls back to Jeongmyeon Sans):',
          ''.join(c for c in chars if ord(c) not in song and not c.isspace()) or '-')
    header = ('/* Generated by design/works/idphoto/scripts/fonts.py. Song Myung (SIL OFL 1.1) and\n'
              '   Jeongmyeon Sans: NanumSquare Neo by NAVER (SIL OFL 1.1), subset and renamed because the\n'
              '   Nanum names are reserved. See fonts/OFL-JeongmyeonSans.txt. */\n')
    (SITE / 'css' / 'fonts.css').write_text(header + '\n'.join(rules), encoding='utf-8')
    print('wrote css/fonts.css')
    if bad:
        sys.exit('some characters are missing or empty in a Jeongmyeon Sans file')


if __name__ == '__main__':
    main()

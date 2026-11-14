"""Subset Kakao Big Sans and Kakao Small Sans to the characters the optician page uses.

    <fontenv>/python.exe -I design/works/optician/scripts/fonts.py <folder with the official TTFs>

The TTFs come from Kakao's own download (kakaocorp.com, "카카오 큰글씨 & 작은글씨", 2025-05-29:
카카오큰글씨.zip and 카카오작은글씨.zip, TTF folders). Licence: SIL OFL 1.1 (name ID 13 in every
file). No Reserved Font Name is declared, but name ID 7 says each name is a registered trademark
of Kakao Corp., so the subsets are renamed "Ttoryeot Display" and "Ttoryeot Text".

What the script changes besides subsetting: the family has no `tnum` feature and its digits
are proportional (1 is narrower), so every digit is set to the advance of 0 and centred in it.
Prices, the dioptre readout, the frame stamp and the hours then line up without a feature.

Scans works/optician/index.html and js/*.js for every character, writes the woff2 files to
works/optician/fonts/ and works/optician/css/fonts.css, then checks with fontTools that every
character really is in every file. Re-run whenever copy changes.
"""
import copy
import io
import pathlib
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'optician'
OUT = SITE / 'fonts'
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None

# (source file, new family, css weight range, output file)
FACES = [
    ('KakaoSmallSans-Regular.ttf', 'Ttoryeot Text', '400', 'ttoryeot-text-400.woff2'),
    ('KakaoSmallSans-Bold.ttf', 'Ttoryeot Text', '700', 'ttoryeot-text-700.woff2'),
    ('KakaoBigSans-ExtraBold.ttf', 'Ttoryeot Display', '800 900', 'ttoryeot-display-800.woff2'),
]
DIGITS = '0123456789'


def used_chars():
    text = (SITE / 'index.html').read_text(encoding='utf-8')
    for js in sorted((SITE / 'js').rglob('*.js')):
        text += js.read_text(encoding='utf-8')
    text = text.replace('&amp;', '&').replace('&nbsp;', ' ')
    chars = set(ch for ch in text if ord(ch) >= 32)
    chars |= set(chr(c) for c in range(32, 127))
    chars |= set(' ·–—−×□')
    chars -= {'﻿', '⁠'}  # the word joiner is default-ignorable; browsers draw nothing for it
    return ''.join(sorted(chars))


def tabular_digits(font):
    """Give 0-9 one advance (the width of 0) and centre each outline in it."""
    cmap = font.getBestCmap()
    glyf, hmtx = font['glyf'], font['hmtx']
    width = hmtx[cmap[ord('0')]][0]
    for d in DIGITS:
        name = cmap[ord(d)]
        g = glyf[name]
        if g.isComposite():
            g = copy.deepcopy(g)
            g.expand(glyf)
        if not g.numberOfContours:
            continue
        g.recalcBounds(glyf)
        ink = g.xMax - g.xMin
        dx = round((width - ink) / 2) - g.xMin
        if g.isComposite():
            for c in g.components:
                c.x += dx
        else:
            g.coordinates.translate((dx, 0))
        g.recalcBounds(glyf)
        glyf[name] = g
        hmtx[name] = (width, g.xMin)
    return width


def digit_kerning(font):
    """Kern pairs between two digits would undo the tabular widths; report them."""
    cmap = font.getBestCmap()
    dg = {cmap[ord(d)] for d in DIGITS}
    hits = 0
    for lookup in font['GPOS'].table.LookupList.Lookup:
        for st in lookup.SubTable:
            if lookup.LookupType == 9:
                st = st.ExtSubTable
            if getattr(st, 'LookupType', 2) != 2 or not hasattr(st, 'Format'):
                continue
            cov = st.Coverage.glyphs
            if st.Format == 1:
                for g1, ps in zip(cov, st.PairSet):
                    if g1 in dg:
                        hits += sum(1 for r in ps.PairValueRecord if r.SecondGlyph in dg and getattr(r.Value1, 'XAdvance', 0))
            elif st.Format == 2:
                c1 = st.ClassDef1.classDefs
                c2 = st.ClassDef2.classDefs
                for g1 in dg & set(cov):
                    row = st.Class1Record[c1.get(g1, 0)]
                    for g2 in dg:
                        v = row.Class2Record[c2.get(g2, 0)].Value1
                        if v is not None and getattr(v, 'XAdvance', 0):
                            hits += 1
    return hits


def rename(font, family):
    name = font['name']
    style = (name.getName(17, 3, 1, 0x409) or name.getName(2, 3, 1, 0x409)).toUnicode()
    ps = (family + '-' + style).replace(' ', '')
    full = family if style == 'Regular' else f'{family} {style}'
    keep = []
    for rec in name.names:
        nid = rec.nameID
        if nid in (1, 4, 16, 18, 21) and rec.langID not in (0x409, 0):
            continue  # localised names still carry the original family
        if nid in (1, 16, 21):
            rec.string = family
        elif nid in (4, 18):
            rec.string = full
        elif nid == 6:
            rec.string = ps
        elif nid == 3:
            rec.string = f'{ps};subset'
        keep.append(rec)
    name.names = keep


def main():
    if not SRC:
        sys.exit(__doc__)
    chars = used_chars()
    print(len(chars), 'unique characters')
    rules, failed = [], False
    for src, family, weight, out in FACES:
        font = TTFont(SRC / src)
        width = tabular_digits(font)
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['kern', 'calt', 'liga']
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        opts.hinting = False
        opts.notdef_outline = True
        sub = subset.Subsetter(opts)
        sub.populate(text=chars)
        sub.subset(font)
        rename(font, family)
        kerned = digit_kerning(font)
        path = OUT / out
        font.flavor = 'woff2'
        font.save(path)
        check = TTFont(path)
        cmap = check.getBestCmap()
        missing = [c for c in chars if ord(c) not in cmap and c != ' ']
        failed |= bool(missing)
        fam = check['name'].getName(1, 3, 1, 0x409).toUnicode()
        print(f'{out}  {path.stat().st_size / 1024:.1f} KB  family {fam!r}  glyphs {len(cmap)}  '
              f'digit width {width}  digit kern pairs {kerned}  missing {"".join(missing) or "-"}')
        rules.append(
            '@font-face {\n'
            f"  font-family: '{family}';\n"
            f"  src: url('../fonts/{out}') format('woff2');\n"
            f'  font-weight: {weight};\n'
            '  font-style: normal;\n'
            '  font-display: swap;\n'
            '}\n')
    header = ('/* Generated by design/works/optician/scripts/fonts.py.\n'
              '   Ttoryeot Text = Kakao Small Sans, Ttoryeot Display = Kakao Big Sans (SIL OFL 1.1),\n'
              '   subset to the characters this page uses, renamed, digits set to one width. */\n')
    (SITE / 'css' / 'fonts.css').write_text(header + '\n'.join(rules), encoding='utf-8')
    print('wrote css/fonts.css')
    if failed:
        sys.exit('some characters are missing from the subset')


if __name__ == '__main__':
    main()

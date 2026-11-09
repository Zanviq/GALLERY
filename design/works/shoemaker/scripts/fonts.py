"""Subset the two families to the characters works/shoemaker actually uses.

    <fontenv>/python.exe -I design/works/shoemaker/scripts/fonts.py <dir with source TTFs>

Sources (downloaded once into the scratch folder, not kept in the repo):
  GowunBatang-Regular.ttf, GowunBatang-Bold.ttf
      github.com/google/fonts/ofl/gowunbatang (SIL OFL 1.1, no Reserved Font Name), plus its OFL.txt
  NanumBarunGothicWeb.ttf, NanumBarunGothicWebBold.ttf
      hangeul.pstatic.net/hangeul_static/webfont/NanumBarunGothic/ (NAVER, SIL OFL 1.1)

"NanumBarunGothic" is a Reserved Font Name in NAVER's OFL notice. A subset is a Modified Version,
so the subset is renamed inside the font ("Golbon Gothic") and in CSS. Re-run whenever copy
changes; it fails if any character is missing from any face.
"""
import html
import pathlib
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'shoemaker'
OUT = SITE / 'fonts'
SRC = pathlib.Path(sys.argv[1])

FACES = [
    # (source, out stem, css family, weight, new family or None, style)
    ('GowunBatang-Regular.ttf', 'gowun-batang-400', 'Gowun Batang', 400, None, 'Regular'),
    ('GowunBatang-Bold.ttf', 'gowun-batang-700', 'Gowun Batang', 700, None, 'Bold'),
    ('NanumBarunGothicWeb.ttf', 'golbon-gothic-400', 'Golbon Gothic', 400, 'Golbon Gothic', 'Regular'),
    ('NanumBarunGothicWebBold.ttf', 'golbon-gothic-700', 'Golbon Gothic', 700, 'Golbon Gothic', 'Bold'),
]

NAVER_NOTICE = (
    'Copyright (c) 2010, NAVER Corporation (https://www.navercorp.com/) with Reserved Font Name Nanum, '
    'Naver Nanum, NanumGothic, Naver NanumGothic, NanumMyeongjo, Naver NanumMyeongjo, NanumBrush, '
    'Naver NanumBrush, NanumPen, Naver NanumPen, Naver NanumGothicEco, NanumGothicEco, Naver '
    'NanumMyeongjoEco, NanumMyeongjoEco, Naver NanumGothicLight, NanumGothicLight, NanumBarunGothic, '
    'Naver NanumBarunGothic, NanumSquareRound, NanumBarunPen, MaruBuri, NanumSquareNeo')


def used_chars():
    text = (SITE / 'index.html').read_text(encoding='utf-8')
    text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    text = html.unescape(text)
    for js in sorted((SITE / 'js').rglob('*.js')):
        src = js.read_text(encoding='utf-8')
        src = re.sub(r'(?m)^\s*//[^\n]*', '', src)
        src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
        text += src
    chars = set(ch for ch in text if ord(ch) >= 32)
    chars |= set(chr(c) for c in range(32, 127))
    chars |= set('·‘’“”…×–—')
    chars.discard('﻿')
    return chars


def rename(font, family, style):
    ps = family.replace(' ', '') + '-' + style
    names = {1: family, 2: style, 3: f'{ps};subset for gallery.zanviq.dev/shoemaker', 4: f'{family} {style}' if style != 'Regular' else family,
             6: ps, 16: family, 17: style}
    table = font['name']
    for rec in list(table.names):
        if rec.nameID in (1, 2, 3, 4, 6, 16, 17, 18, 21, 22):
            table.removeNames(nameID=rec.nameID, platformID=rec.platformID, platEncID=rec.platEncID, langID=rec.langID)
    for nid, val in names.items():
        table.setName(val, nid, 3, 1, 0x409)
        table.setName(val, nid, 1, 0, 0)
    table.setName(NAVER_NOTICE, 0, 3, 1, 0x409)
    table.setName('Modified Version (subset) of NanumBarunGothic by NAVER Corporation, renamed under the '
                  'SIL Open Font License 1.1 Reserved Font Name clause.', 10, 3, 1, 0x409)
    table.setName('This Font Software is licensed under the SIL Open Font License, Version 1.1.', 13, 3, 1, 0x409)
    table.setName('https://openfontlicense.org', 14, 3, 1, 0x409)


def licences():
    gowun = (SRC / 'OFL-GowunBatang.txt').read_text(encoding='utf-8')
    (OUT / 'OFL-GowunBatang.txt').write_text(gowun, encoding='utf-8')
    body = gowun[gowun.index('This Font Software is licensed'):]
    head = (NAVER_NOTICE + '\n\n'
            'Source: NAVER hangeul.naver.com/font (webfont files at\n'
            'hangeul.pstatic.net/hangeul_static/webfont/NanumBarunGothic/).\n'
            'Licence notice as published by NAVER (네이버 나눔글꼴 라이선스).\n\n'
            'Note on the files in this folder: golbon-gothic-400.woff2 and golbon-gothic-700.woff2 are a\n'
            'Modified Version (subsets) of NanumBarunGothic Regular and Bold. Because "NanumBarunGothic"\n'
            'is a Reserved Font Name, the Modified Version is renamed "Golbon Gothic" in its name table\n'
            'and CSS. The copyright and licence records are written into the files.\n\n')
    (OUT / 'OFL-NanumBarunGothic.txt').write_text(head + body, encoding='utf-8')


def main():
    chars = used_chars()
    print(len(chars), 'unique characters')
    OUT.mkdir(exist_ok=True)
    rules = []
    bad = False
    for src, stem, family, weight, newfam, style in FACES:
        font = TTFont(SRC / src)
        cmap = font.getBestCmap()
        missing = sorted(ch for ch in chars if ord(ch) not in cmap and not ch.isspace())
        if missing:
            bad = True
            print(f'{stem}: not in source font:', ' '.join(f'{c} U+{ord(c):04X}' for c in missing))
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'tnum', 'pnum']
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        opts.notdef_outline = True
        opts.hinting = False
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=[ord(c) for c in chars if ord(c) in cmap])
        sub.subset(font)
        if newfam:
            rename(font, newfam, style)
        path = OUT / f'{stem}.woff2'
        font.flavor = 'woff2'
        font.save(path)
        print(f'{path.name}  {path.stat().st_size / 1024:.1f} KB')
        rules.append('@font-face {\n'
                     f"  font-family: '{family}';\n"
                     f"  src: url('../fonts/{stem}.woff2') format('woff2');\n"
                     f'  font-weight: {weight};\n'
                     '  font-style: normal;\n'
                     '  font-display: swap;\n'
                     '}\n')
    header = ('/* Generated by design/works/shoemaker/scripts/fonts.py. Subsets holding only the characters this page uses.\n'
              '   Gowun Batang: SIL OFL 1.1 (fonts/OFL-GowunBatang.txt).\n'
              '   Golbon Gothic: a renamed subset of NAVER NanumBarunGothic, SIL OFL 1.1 (fonts/OFL-NanumBarunGothic.txt). */\n')
    (SITE / 'css' / 'fonts.css').write_text(header + '\n'.join(rules), encoding='utf-8')
    licences()
    print('wrote css/fonts.css and licences')
    if bad:
        sys.exit('some characters are missing')


if __name__ == '__main__':
    main()
